function isTypeClassComponent(t) {
  return (
    typeof t === 'function' &&
    t.prototype &&
    typeof t.prototype.render === 'function'
  );
}

function isTypeFunctionalComponent(t) {
  return (
    typeof t === 'function' &&
    (!t.prototype || typeof t.prototype.render !== 'function')
  );
}

function setProp(dom, name, value) {
  if (name === 'className') {
    dom.setAttribute('class', value);

    return;
  }

  if (name.startsWith('on') && typeof value === 'function') {
    const nameEvent = name.slice(2).toLowerCase();

    dom.__listeners = dom.__listeners || {};

    if (dom.__listeners[nameEvent]) {
      dom.removeEventListener(nameEvent, dom.__listeners[nameEvent]);
    }

    dom.addEventListener(nameEvent, value);
    dom.__listeners[nameEvent] = value;

    return;
  }

  if (name === 'style' && typeof value === 'object') {
    Object.assign(dom.style, value);

    return;
  }

  if (name === 'ref' && typeof value === 'function') {
    value(dom);

    return;
  }

  if (value === false || value === null || value === undefined) {
    dom.removeAttribute(name);

    return;
  }

  dom.setAttribute(name, value === true ? '' : value);
}

function createDOM(vnode) {
  let { children = [], props = {}, type } = vnode;

  if (type === 'TEXT') {
    return (vnode.__dom = document.createTextNode(props?.nodeValue || ''));
  }

  if (type === 'FRAGMENT') {
    const s = document.createComment('s-fragment');
    const e = document.createComment('e-fragment');

    const elFragment = document.createDocumentFragment();
    elFragment.appendChild(s);
    elFragment.appendChild(e);

    vnode.__start = vnode.__dom = s;
    vnode.__end = e;

    return elFragment;
  }

  const dom = document.createElement(type);

  for (const k in props) {
    setProp(dom, k, props[k]);
  }

  for (const c of children) {
    if (!c) {
      continue;
    }

    if (
      c?.type === 'FRAGMENT' ||
      isTypeClassComponent(c?.type) ||
      isTypeFunctionalComponent(c?.type)
    ) {
      mountNode(dom, c, null);

      continue;
    }

    dom.appendChild(createDOM(c));
  }

  vnode.__dom = dom;

  return dom;
}

function isChanged(vnodeOld, vnodeNew) {
  return (
    typeof vnodeOld !== typeof vnodeNew ||
    (typeof vnodeOld === 'string' && vnodeOld !== vnodeNew) ||
    vnodeOld.type !== vnodeNew.type
  );
}

function insertBeforeOrAppend(parent, node, isBeforeNode) {
  if (isBeforeNode) {
    parent.insertBefore(node, isBeforeNode);

    return;
  }

  parent.appendChild(node);
}

function removeNode(node) {
  if (!node?.parentNode) {
    return;
  }

  node.parentNode.removeChild(node);
}

function removeFragmentRange(vnode) {
  const s = vnode.__start;
  const e = vnode.__end;

  if (!s || !e || !s.parentNode) {
    return;
  }

  let c = s;

  while (c) {
    const next = c.nextSibling;
    s.parentNode.removeChild(c);

    if (c === e) {
      break;
    }

    c = next;
  }
}

function diff(container, vnodeOld, vnodeNew, beforeNode) {
  if (!vnodeOld) {
    mountNode(container, vnodeNew, beforeNode);

    return;
  }

  if (!vnodeNew) {
    unmountNode(container, vnodeOld);

    return;
  }

  if (isChanged(vnodeOld, vnodeNew)) {
    unmountNode(container, vnodeOld);
    mountNode(container, vnodeNew, beforeNode);

    return;
  }

  if (vnodeNew.type === 'TEXT') {
    vnodeNew.__dom = vnodeOld.__dom;

    if (vnodeOld.props.nodeValue === vnodeNew.props.nodeValue) {
      return;
    }

    vnodeNew.__dom.nodeValue = vnodeNew.props.nodeValue;

    return;
  }

  if (vnodeNew.type === 'FRAGMENT') {
    vnodeNew.__start = vnodeOld.__start;
    vnodeNew.__end = vnodeOld.__end;
    vnodeNew.__dom = vnodeOld.__dom;
    const szVNodeOld = vnodeOld.children.length;
    const szVNodeNew = vnodeNew.children.length;
    const cntMax = Math.max(szVNodeOld, szVNodeNew);

    for (let i = 0; i < cntMax; ++i) {
      diff(
        container,
        i < szVNodeOld ? vnodeOld.children[i] : null,
        i < szVNodeNew ? vnodeNew.children[i] : null,
        vnodeNew.__end
      );
    }

    return;
  }

  if (isTypeClassComponent(vnodeNew.type)) {
    updateComponent(container, vnodeOld, vnodeNew, beforeNode);

    return;
  }

  if (isTypeFunctionalComponent(vnodeNew.type)) {
    updateFunctional(container, vnodeOld, vnodeNew, beforeNode);

    return;
  }

  const dom = (vnodeNew.__dom = vnodeOld.__dom);
  const propsOld = vnodeOld.props || {};
  const propsNew = vnodeNew.props || {};

  for (const key in propsOld) {
    if (key in propsNew) {
      continue;
    }

    setProp(dom, key, null);
  }

  for (const key in propsNew) {
    setProp(dom, key, propsNew[key]);
  }

  const szVNodeOld = vnodeOld.children.length;
  const szVNodeNew = vnodeNew.children.length;
  const cntMax = Math.max(szVNodeOld, szVNodeNew);

  for (let i = 0; i < cntMax; ++i) {
    diff(
      dom,
      i < szVNodeOld ? vnodeOld.children[i] : null,
      i < szVNodeNew ? vnodeNew.children[i] : null,
      null
    );
  }
}

function render(vnode, container) {
  diff(container, container.__vnode || null, vnode, null);
  container.__vnode = vnode;
}

function createElement(type, props = {}, ...children) {
  return {
    children: children
      .flat()
      .filter((c) => c !== null && c !== undefined && c !== false)
      .map((c) =>
        typeof c === 'string' || typeof c === 'number'
          ? { children: [], props: { nodeValue: String(c) }, type: 'TEXT' }
          : c
      ),
    props,
    type: type === 'fragment' ? 'FRAGMENT' : type,
  };
}

function mountNode(container, vnode, beforeNode) {
  if (vnode?.type === 'FRAGMENT') {
    const s = document.createComment('s-fragment');
    const e = document.createComment('e-fragment');
    vnode.__start = vnode.__dom = s;
    vnode.__end = e;
    insertBeforeOrAppend(container, s, beforeNode);
    insertBeforeOrAppend(container, e, beforeNode);
    const children = vnode.children || [];

    for (const c of children) {
      mountNode(container, c, e);
    }

    return;
  }

  if (isTypeClassComponent(vnode?.type)) {
    mountComponent(container, vnode, beforeNode);

    return;
  }

  if (isTypeFunctionalComponent(vnode?.type)) {
    mountFunctional(container, vnode, beforeNode);

    return;
  }

  insertBeforeOrAppend(container, createDOM(vnode), beforeNode);
}

function unmountNode(container, vnode) {
  if (!vnode) {
    return;
  }

  if (isTypeClassComponent(vnode.type)) {
    const instance = vnode.__instance;

    if (instance && typeof instance.unmount === 'function') {
      try {
        instance.unmount();
      } catch {
        // ignore
      }
    }

    if (vnode.__rendered) {
      unmountNode(container, vnode.__rendered);
    }

    if (vnode.__dom) {
      removeNode(vnode.__dom);
    }

    return;
  }

  if (isTypeFunctionalComponent(vnode.type)) {
    if (vnode.__rendered) {
      unmountNode(container, vnode.__rendered);
    }

    if (vnode.__dom) {
      removeNode(vnode.__dom);
    }

    return;
  }

  if (vnode.type === 'FRAGMENT') {
    removeFragmentRange(vnode);

    return;
  }

  removeNode(vnode.__dom);
}

function mountComponent(container, vnode, beforeNode) {
  const ComponentClass = vnode.type;

  if (!isTypeClassComponent(ComponentClass)) {
    throw new Error(
      'Functional components cannot be mounted as class components...'
    );
  }

  const instance = new ComponentClass({
    ...(vnode.props || {}),
    children: (vnode.children || [])
      .flat()
      .filter((c) => c !== null && c !== undefined && c !== false),
  });
  vnode.__instance = instance;
  instance.__vnode = vnode;
  instance.__updater = function () {
    const renderedOld = vnode.__rendered;
    const renderedNew = instance.render(createElement);
    vnode.__rendered = renderedNew;
    diff(container, renderedOld || null, renderedNew, beforeNode || null);
    vnode.__dom = renderedNew && renderedNew.__dom;
  };
  const renderedNew = instance.render(createElement);
  vnode.__rendered = renderedNew;
  diff(container, null, renderedNew, beforeNode || null);
  vnode.__dom = renderedNew && renderedNew.__dom;

  if (typeof instance.componentDidMount !== 'function') {
    return;
  }

  queueMicrotask(() => instance.componentDidMount());
}

function updateComponent(container, vnodeOld, vnodeNew, beforeNode) {
  const instance = vnodeOld.__instance;
  vnodeNew.__instance = instance;
  instance.__vnode = vnodeNew;
  instance.props = {
    ...(vnodeNew.props || {}),
    children: (vnodeNew.children || [])
      .flat()
      .filter((c) => c !== null && c !== undefined && c !== false),
  };
  const renderedOld = vnodeOld.__rendered;
  const renderedNew = instance.render(createElement);
  vnodeNew.__rendered = renderedNew;
  diff(container, renderedOld, renderedNew, beforeNode || null);
  vnodeNew.__dom = renderedNew && renderedNew.__dom;
}

function mountFunctional(container, vnode, beforeNode) {
  const rendered = vnode.type({
    ...(vnode.props || {}),
    children: (vnode.children || [])
      .flat()
      .filter((c) => c !== null && c !== undefined && c !== false),
  });
  vnode.__rendered = rendered;
  diff(container, null, rendered, beforeNode || null);
  vnode.__dom = rendered && rendered.__dom;
}

function updateFunctional(container, vnodeOld, vnodeNew, beforeNode) {
  const renderedOld = vnodeOld.__rendered;
  const renderedNew = vnodeNew.type({
    ...(vnodeNew.props || {}),
    children: (vnodeNew.children || [])
      .flat()
      .filter((c) => c !== null && c !== undefined && c !== false),
  });
  vnodeNew.__rendered = renderedNew;
  diff(container, renderedOld, renderedNew, beforeNode || null);
  vnodeNew.__dom = renderedNew && renderedNew.__dom;
}

export { createElement, render };

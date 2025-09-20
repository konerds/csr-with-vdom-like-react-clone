const C_TYPE_FRAGMENT = "FRAGMENT";
const C_TYPE_TEXT = "TEXT";

const polyfillRequestIdleCallback =
  typeof requestIdleCallback === "function"
    ? requestIdleCallback
    : (cb) =>
        setTimeout(() => cb({ timeRemaining: () => 0, didTimeout: true }), 1);

function isTypeClassComponent(t) {
  return typeof t === "function" && typeof t.prototype?.render === "function";
}

function setProp(dom, name, value) {
  if (name === "className") {
    if (value == null || value === false) {
      dom.removeAttribute("class");

      return;
    }

    dom.setAttribute("class", value);

    return;
  }

  if (name.startsWith("on") && (typeof value === "function" || value == null)) {
    const nameEvent = name.slice(2).toLowerCase();
    dom.__listeners = dom.__listeners || {};

    if (dom.__listeners[nameEvent]) {
      dom.removeEventListener(nameEvent, dom.__listeners[nameEvent]);
      delete dom.__listeners[nameEvent];
    }

    if (typeof value === "function") {
      dom.addEventListener(nameEvent, value);
      dom.__listeners[nameEvent] = value;
    }

    return;
  }

  if (name === "style" && typeof value === "object") {
    dom.removeAttribute("style");
    Object.assign(dom.style, value || {});

    return;
  }

  if (name === "ref" && typeof value === "function") {
    value(dom || null);

    return;
  }

  if (value === false || value === null || value === undefined) {
    dom.removeAttribute(name);

    return;
  }

  dom.setAttribute(name, value === true ? "" : value);
}

function updateDom(dom, propsPrev, propsNext, type) {
  if (type === C_TYPE_TEXT) {
    const nodeValue = propsNext?.nodeValue;

    if (propsPrev?.nodeValue !== nodeValue) {
      dom.nodeValue = nodeValue ?? "";
    }

    return;
  }

  const keys = new Set([
    ...Object.keys(propsPrev || {}),
    ...Object.keys(propsNext || {}),
  ]);

  for (const k of keys) {
    const valuePropsNext = propsNext ? propsNext[k] : undefined;

    if ((propsPrev ? propsPrev[k] : undefined) === valuePropsNext) {
      continue;
    }

    setProp(dom, k, valuePropsNext);
  }
}

function createElement(type, props = {}, ...children) {
  return {
    props: {
      ...(props || {}),
      children: children
        .flat()
        .filter((c) => c !== null && c !== undefined && c !== false)
        .map((c) =>
          typeof c === "string" || typeof c === "number"
            ? {
                children: [],
                props: { nodeValue: String(c) },
                type: C_TYPE_TEXT,
              }
            : c
        ),
    },
    type,
  };
}

let nextUnitOfWork = null;
let wipRoot = null;

function workLoop(deadline) {
  let shouldYield = false;

  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  polyfillRequestIdleCallback(workLoop);
}

polyfillRequestIdleCallback(workLoop);

function createDomFromFiber(fiber) {
  if (fiber.type === C_TYPE_TEXT) {
    return document.createTextNode(fiber.props?.nodeValue || "");
  }

  if (fiber.type === C_TYPE_FRAGMENT) {
    return null;
  }

  const dom = document.createElement(fiber.type);
  updateDom(dom, {}, fiber.props || {}, fiber.type);

  return dom;
}

let pendingsLayoutEffects = [];

function flushLayoutEffects() {
  const runs = pendingsLayoutEffects;
  pendingsLayoutEffects = [];

  for (const { hook } of runs) {
    if (typeof hook.cleanup === "function") {
      try {
        hook.cleanup();
      } catch (_) {
        // ignore
      }

      hook.cleanup = undefined;
    }

    const r = typeof hook.create === "function" ? hook.create() : undefined;
    hook.cleanup = typeof r === "function" ? r : undefined;
  }
}

let pendingsPassiveEffects = [];

function schedulePassiveEffectsFlush() {
  const runs = pendingsPassiveEffects;
  pendingsPassiveEffects = [];

  setTimeout(() => {
    for (const { hook } of runs) {
      if (typeof hook.cleanup === "function") {
        try {
          hook.cleanup();
        } catch (_) {
          // ignore
        }

        hook.cleanup = undefined;
      }

      const r = typeof hook.create === "function" ? hook.create() : undefined;
      hook.cleanup = typeof r === "function" ? r : undefined;
    }
  }, 0);
}

let deletions = [];
let currentRoot = null;

function commitRoot() {
  for (const deletion of deletions) {
    commitWork(deletion);
  }

  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  flushLayoutEffects();
  schedulePassiveEffectsFlush();
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  let parentFiber = fiber.parent;

  while (parentFiber && !parentFiber.dom) {
    parentFiber = parentFiber.parent;
  }

  const domParent = parentFiber ? parentFiber.dom : null;

  if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent);

    return;
  }

  if (fiber.effectTag === "PLACEMENT") {
    if (fiber.dom && domParent) {
      domParent.appendChild(fiber.dom);
    } else if (
      fiber.stateNode &&
      typeof fiber.stateNode.componentDidMount === "function"
    ) {
      queueMicrotask(() => {
        try {
          fiber.stateNode.componentDidMount();
        } catch (_) {
          // ignore
        }
      });
    }
  } else if (fiber.effectTag === "UPDATE" && fiber.dom) {
    updateDom(
      fiber.dom,
      (fiber.alternate && fiber.alternate.props) || {},
      fiber.props || {},
      fiber.type
    );
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function cleanupEffectsOnFiber(fiber) {
  if (!fiber?.hooks) {
    return;
  }

  const { hooks } = fiber;

  for (const h of hooks) {
    if (
      (h?.tag === "layout" || h?.tag === "effect") &&
      typeof h?.cleanup === "function"
    ) {
      try {
        h.cleanup();
      } catch (_) {
        // ignore
      }

      h.cleanup = undefined;
    }
  }
}

function commitDeletion(fiber, domParent) {
  if (!fiber) {
    return;
  }

  cleanupEffectsOnFiber(fiber);

  if (fiber.dom) {
    if (fiber.dom.parentNode) {
      fiber.dom.parentNode.removeChild(fiber.dom);
    }

    return;
  }

  commitDeletion(fiber.child, domParent);

  if (fiber.sibling) {
    commitDeletion(fiber.sibling, domParent);
  }
}

function render(vnode, container) {
  nextUnitOfWork = wipRoot = {
    dom: container,
    props: { children: [vnode] },
    alternate: currentRoot,
  };
  container.__vnode = vnode;
  deletions = [];
}

function performUnitOfWork(fiber) {
  if (typeof fiber.type === "function") {
    updateCompositeComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  if (fiber.child) {
    return fiber.child;
  }

  let next = fiber;

  while (next) {
    if (next.sibling) {
      return next.sibling;
    }

    next = next.parent;
  }

  return null;
}

let wipFiber = null;

function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;

  while (index < (elements ? elements.length : 0) || oldFiber != null) {
    const element = elements && elements[index];
    const sameType = oldFiber && element && element.type === oldFiber.type;
    let newFiber = null;

    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
        stateNode: oldFiber.stateNode,
      };
    }

    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      };
    }

    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      wipFiber.child = newFiber;
    } else if (prevSibling) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    ++index;
  }
}

let hookIndex = null;

function updateCompositeComponent(fiber) {
  const t = fiber.type;

  if (isTypeClassComponent(t)) {
    let instance = fiber.stateNode;

    if (!instance) {
      fiber.stateNode = instance = new t({
        ...(fiber.props || {}),
        children: fiber.props?.children || [],
      });
      instance.__updater = function __updater() {
        if (!currentRoot) {
          return;
        }

        nextUnitOfWork = wipRoot = {
          dom: currentRoot.dom,
          props: currentRoot.props,
          alternate: currentRoot,
        };
        deletions = [];
      };
    } else {
      instance.props = {
        ...(fiber.props || {}),
        children: fiber.props?.children || [],
      };
    }

    reconcileChildren(fiber, [instance.render(createElement)]);

    return;
  }

  hookIndex = 0;
  wipFiber = fiber;
  wipFiber.hooks = [];
  reconcileChildren(fiber, [
    t({
      ...(fiber.props || {}),
      children: fiber.props?.children || [],
    }),
  ]);
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDomFromFiber(fiber);
  }

  reconcileChildren(
    fiber,
    fiber.props && Array.isArray(fiber.props.children)
      ? fiber.props.children
      : []
  );
}

function useState(initial) {
  const oldHook =
    wipFiber &&
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex];
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };
  const actions = oldHook ? oldHook.queue : [];

  for (const action of actions) {
    hook.state = (typeof action === "function" ? action : () => action)(
      hook.state
    );
  }

  wipFiber.hooks.push(hook);
  ++hookIndex;

  return [
    hook.state,
    (action) => {
      hook.queue.push(action);

      if (!currentRoot) {
        return;
      }

      nextUnitOfWork = wipRoot = {
        dom: currentRoot.dom,
        props: currentRoot.props,
        alternate: currentRoot,
      };
      deletions = [];
    },
  ];
}

function _areDependenciesChanged(prev, next) {
  if (prev?.length !== next?.length) {
    return true;
  }

  for (let i = 0; i < prev.length; ++i) {
    if (!Object.is(prev[i], next[i])) {
      return true;
    }
  }

  return false;
}

function pushToPendings(tag, create, deps) {
  const isLayoutEffect = tag === "layout";
  const oldHook =
    wipFiber?.alternate?.hooks && wipFiber.alternate.hooks[hookIndex];
  const hook = {
    tag,
    create,
    deps,
    cleanup: oldHook?.cleanup,
  };
  wipFiber.hooks.push(hook);
  ++hookIndex;

  if (!_areDependenciesChanged(oldHook?.deps, deps)) {
    return;
  }

  (isLayoutEffect ? pendingsLayoutEffects : pendingsPassiveEffects).push({
    fiber: wipFiber,
    hook,
  });
}

function useEffect(create, deps) {
  pushToPendings("effect", create, deps);
}

function useLayoutEffect(create, deps) {
  pushToPendings("layout", create, deps);
}

export {
  createElement,
  render,
  useState,
  useEffect,
  useLayoutEffect,
  C_TYPE_TEXT,
  C_TYPE_FRAGMENT,
};

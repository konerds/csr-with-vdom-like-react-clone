import { createElement, render } from './vdom.js';

class Component {
  constructor(props = {}) {
    this.props = props;
    this.state = this.state || {};
    this.isMounted = false;
    this.containerRef = null;
  }

  setState(patch) {
    this.state = {
      ...this.state,
      ...(typeof patch === 'function' ? patch(this.state) : patch),
    };

    if (typeof this.__updater === 'function') {
      this.__updater();

      return;
    }

    this.updateInternal();
  }

  mount(container) {
    this.containerRef = container;
    this.isMounted = true;
    this.updateInternal();

    if (typeof this.componentDidMount !== 'function') {
      return;
    }

    queueMicrotask(() => this.componentDidMount());
  }

  unmount() {
    this.isMounted = false;
    this.containerRef = null;
  }

  updateInternal() {
    if (typeof this.__updater === 'function') {
      this.__updater();

      return;
    }

    if (!this.isMounted || !this.containerRef) {
      return;
    }

    const vnode = this.render(createElement);
    vnode.props = vnode.props || {};
    vnode.props['data-component'] = this.constructor.name;

    render(vnode, this.containerRef);
  }
}

export { Component };

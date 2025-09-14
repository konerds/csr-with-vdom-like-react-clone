import { Component } from "../core/component.js";
import { createElement as el } from "../core/vdom.js";

class Page404 extends Component {
  render() {
    const { route } = this.props;

    return el("main", { className: `${route}-page` }, "404 Not Found");
  }
}

export { Page404 };

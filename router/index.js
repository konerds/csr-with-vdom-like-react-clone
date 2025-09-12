import { Component } from "../core/component.js";
import { Router } from "../core/router.js";
import { createElement as el } from "../core/vdom.js";

const ROUTES = [{ handler: "base", path: "/" }];

class ProviderRouter extends Component {
  constructor(props = {}) {
    super(props);

    this.state = { params: null, route: "base" };
    this.router = null;
  }

  componentDidMount() {
    const { mode = "history" } = this.props;

    this.router = new Router({
      mode,
      onRoute: (handler, params) => {
        this.setState({ params, route: handler });
      },
      routes: ROUTES,
    });

    this.router.resolve();
  }

  unmount() {
    this.router = null;

    super.unmount();
  }

  render() {
    let elPage = null;

    switch (this.state.route) {
      case "base":
        elPage = el("div", { className: "page" }, "Page Base");

        break;
      default:
        elPage = el("div", { className: "page" }, "Not Found");

        break;
    }

    return elPage;
  }
}

export { ProviderRouter };

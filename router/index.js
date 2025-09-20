import { getConfigs } from "../configs/index.js";
import { Component } from "../core/component.js";
import { Router } from "../core/router.js";
import { C_TYPE_FRAGMENT, createElement as el } from "../core/vdom.js";
import { PageTodo } from "../pages/todos/slug.js";
import { PageTodos } from "../pages/todos/index.js";
import { Page404 } from "../pages/not-found.js";

const { CFG_MODES_ROUTER } = getConfigs();

const HANDLERS = Object.freeze({
  BASE: "base",
  TODO: "todo",
  TODOS: "todos",
  NOT_FOUND: "not-found",
});
const PATHS = Object.freeze({
  BASE: "/",
  TODO: "/todos/:id",
  TODOS: "/todos",
  NOT_FOUND: "/404",
});
const ROUTES = [
  { handler: HANDLERS.BASE, path: PATHS.BASE },
  { handler: HANDLERS.TODO, path: PATHS.TODO },
  { handler: HANDLERS.TODOS, path: PATHS.TODOS },
  { handler: HANDLERS.NOT_FOUND, path: PATHS.NOT_FOUND },
  { handler: HANDLERS.NOT_FOUND, path: "*" },
];

class ProviderRouter extends Component {
  constructor(props = {}) {
    super(props);

    this.state = {
      params: {},
      pathname: PATHS.BASE,
      query: {},
      route: HANDLERS.BASE,
    };
    this.router = null;
  }

  componentDidMount() {
    const { mode = CFG_MODES_ROUTER.HASH } = this.props;

    const navigate = (to) => {
      if (window.location.pathname + window.location.search === to) {
        return;
      }

      this.router.navigate(to, { replace: true });
    };

    this.router = new Router({
      mode,
      onRoute: (handler, params, query, pathname) => {
        if (handler === HANDLERS.NOT_FOUND && pathname !== PATHS.NOT_FOUND) {
          navigate(PATHS.NOT_FOUND);

          return;
        }

        if (handler === HANDLERS.TODO && !params?.id) {
          navigate(PATHS.NOT_FOUND);

          return;
        }

        if (handler === HANDLERS.BASE) {
          navigate(PATHS.TODOS);

          return;
        }

        this.setState({ params, pathname, query, route: handler });
      },
      routes: ROUTES,
    });

    this.router.resolve();
  }

  unmount() {
    if (typeof this.router?.destroy === "function") {
      this.router.destroy();
    }

    this.router = null;

    super.unmount();
  }

  render() {
    const { params, pathname, query, route } = this.state;

    const propsDefault = {
      navigate: (to, opts) => this.router?.navigate(to, opts),
      params,
      pathname,
      query,
      route,
    };

    let elPage = null;

    switch (route) {
      case HANDLERS.BASE:
        elPage = C_TYPE_FRAGMENT;

        break;

      case HANDLERS.TODOS:
        elPage = PageTodos;

        break;

      case HANDLERS.TODO:
        elPage = PageTodo;

        break;

      case HANDLERS.NOT_FOUND:
      default:
        elPage = Page404;

        break;
    }

    return el(elPage, {
      ...propsDefault,
    });
  }
}

export { ProviderRouter };

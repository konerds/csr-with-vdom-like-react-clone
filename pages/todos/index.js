import { Todos } from "../../components/todos/index.js";
import { Component } from "../../core/component.js";
import { createElement as el } from "../../core/vdom.js";
import { fetchTodos } from "../../api/index.js";

class PageTodos extends Component {
  constructor(props) {
    super(props);

    this.state = { todos: [], isLoading: true, isError: false };
  }

  componentDidMount() {
    this.state = {
      isLoading: true,
      isError: false,
    };

    fetchTodos()
      .then((res) => {
        if (!res.ok) {
          this.setState({ isError: true });

          return;
        }

        return res.json();
      })
      .then((todos) => {
        this.setState({ todos });
      })
      .catch((err) => {
        console.error(err);
        this.setState({ isError: true });
      })
      .finally(() => {
        this.setState({ isLoading: false });
      });
  }

  render() {
    const { route } = this.props;

    if (this.state.isError) {
      return el("article", { className: `${route}-page` }, "Error...");
    }

    if (this.state.isLoading) {
      return el("article", { className: `${route}-page` }, "Loading...");
    }

    const { todos } = this.state;

    return el(Todos, {
      className: `${route}-page`,
      todos,
    });
  }
}

export { PageTodos };

import { Todo } from "../../components/todos/todo/index.js";
import { Component } from "../../core/component.js";
import { createElement as el } from "../../core/vdom.js";
import { fetchTodo } from "../../api/index.js";

class PageTodo extends Component {
  constructor(props) {
    super(props);

    this.state = { todo: {}, isLoading: true, isError: false };
  }

  componentDidMount() {
    const { id } = this.props.params;

    this.state = {
      isLoading: true,
      isError: false,
      todo: {},
    };

    fetchTodo(id)
      .then((res) => {
        if (!res.ok) {
          this.setState({ isError: true });

          return;
        }

        return res.json();
      })
      .then((todo) => {
        this.setState({ todo });
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
      return el("section", { className: `${route}-page` }, "Error...");
    }

    if (this.state.isLoading) {
      return el("section", { className: `${route}-page` }, "Loading...");
    }

    if (!this.state.todo.id) {
      return el("section", { className: `${route}-page` }, "No Data...");
    }

    const { todo } = this.state;

    return el(Todo, { className: `${route}-page`, todo });
  }
}

export { PageTodo };

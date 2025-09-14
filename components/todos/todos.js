import { Component } from "../../core/component.js";
import { createElement as el } from "../../core/vdom.js";
import { Todo } from "./todo/todo.js";

class Todos extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { todos } = this.props;

    if (!todos?.length) {
      return el("article", null, "No Todos...");
    }

    return el(
      "article",
      { className: "todos" },
      el(
        "ul",
        { className: "todos__list" },
        todos.map((todo) => el("li", { key: todo.id }, el(Todo, { todo })))
      )
    );
  }
}

export { Todos };

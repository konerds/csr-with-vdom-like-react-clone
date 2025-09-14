import { Component } from "../../../core/component.js";
import { createElement as el } from "../../../core/vdom.js";

class Todo extends Component {
  constructor(props) {
    super(props);

    const { todo } = props;
    this.state = { todo };
  }

  componentDidMount() {
    console.log(this.state.todo);
  }

  render() {
    return el(
      "div",
      { className: "todo-item" },
      el("span", { className: "todo-item__text" }, this.state.todo.text)
    );
  }
}

export { Todo };

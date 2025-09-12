import { Component } from "./core/component.js";
import { createElement as el } from "./core/vdom.js";
import { ProviderRouter } from "./router/index.js";

class App extends Component {
  render() {
    return el(
      "fragment",
      null,
      el(ProviderRouter, {
        mode: "history",
        // mode: 'hash',
      })
    );
  }
}

new App().mount(document.getElementById("app"));

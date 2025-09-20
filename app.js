import { Component } from "./core/component.js";
import { createElement as el, C_TYPE_FRAGMENT } from "./core/vdom.js";
import { ProviderRouter } from "./router/index.js";
import { getConfigs } from "./configs/index.js";

const { CFG_MODES_ROUTER } = getConfigs();
let mode = CFG_MODES_ROUTER.HISTORY;
mode = CFG_MODES_ROUTER.HASH;

class App extends Component {
  render() {
    return el(C_TYPE_FRAGMENT, {}, el(ProviderRouter, { mode }));
  }
}

new App().mount(document.getElementById("app"));

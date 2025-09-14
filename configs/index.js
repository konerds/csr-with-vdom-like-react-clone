const CFG_MODES_ROUTER = {
  HASH: "hash",
  HISTORY: "history",
};

function getConfigs(configs = {}) {
  return {
    ...configs,
    CFG_MODES_ROUTER,
  };
}

export { getConfigs };

function createStore(reducer, statePreloaded) {
  let state =
    statePreloaded === undefined
      ? reducer(undefined, { type: '@@INIT' })
      : statePreloaded;
  const listeners = new Set();

  function getState() {
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);

    return () => listeners.delete(listener);
  }

  function dispatch(action) {
    if (!action || typeof action.type === 'undefined') {
      throw new Error("Action must have 'type' property...");
    }

    state = reducer(state, action);

    for (const listener of listeners) {
      listener();
    }

    return action;
  }

  return { dispatch, getState, subscribe };
}

function combineReducers(reducers) {
  return function root(state = {}, action) {
    const stateNext = {};

    let isChanged = false;

    for (const key in reducers) {
      const statePrev = state[key];
      stateNext[key] = reducers[key](statePrev, action);

      if (stateNext[key] !== statePrev) {
        isChanged = true;
      }
    }

    return isChanged ? stateNext : state;
  };
}

export { combineReducers, createStore };

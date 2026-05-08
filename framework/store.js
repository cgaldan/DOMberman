export class Store {
    constructor(reducer, initialState) {
        if (typeof reducer !== "function") {
            throw new TypeError("Store requires a reducer function.");
        }

        this.reducer = reducer;
        this.listeners = new Set();
        this.middleware = [];
        this.dispatch = this.dispatch.bind(this);
        this.getState = this.getState.bind(this);

        const preloadedState = initialState === undefined ? undefined : initialState;
        this.state = this.reducer(preloadedState, { type: "@@INIT" });
    }

    getState() {
        return this.state;
    }

    dispatch(action) {
        if (typeof action === "function") {
            return action(this.dispatch, this.getState);
        }

        if (!action || typeof action !== "object") {
            throw new TypeError("Actions must be plain objects or functions (thunks).");
        }

        if (typeof action.type === "undefined") {
            throw new TypeError('Actions must include a "type" property.');
        }

        let finalAction = action;
        for (const middleware of this.middleware) {
            finalAction = middleware(finalAction);
        }

        if (!finalAction || typeof finalAction !== "object" || typeof finalAction.type === "undefined") {
            throw new TypeError('Middleware must return an action object with a "type" property.');
        }

        if (!this.reducer) {
            throw new Error('Store has no reducer. Use createStore() to create a store with a reducer.');
        }

        this.state = this.reducer(this.state, finalAction);
        this.notify();
        return finalAction;
    }

    subscribe(listener) {
        this.listeners.add(listener);

        return () => this.listeners.delete(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    use(middleware) {
        if (typeof middleware !== "function") {
            throw new TypeError("Middleware must be a function.");
        }
        this.middleware.push(middleware);
        return () => this.middleware.delete(middleware);
    }
}

export function createStore(reducer, initialState = {}) {
    return new Store(reducer, initialState);
}

export function combineReducers(reducers) {
    return (state = {}, action) => {
      const nextState = {};
      
      Object.keys(reducers).forEach(key => {
        nextState[key] = reducers[key](state[key], action);
      });
      
      return nextState;
    };
  }
  
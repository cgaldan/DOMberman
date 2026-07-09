# Mini Framework Guide

This project is a small browser JavaScript framework built from scratch. It is
designed to be easy to inspect: public APIs live in `src/framework/index.js`,
the TodoMVC app lives in `src/todomvc/`, and the repository runs without a
frontend build tool.

The framework demonstrates four required capabilities:

- DOM abstraction through virtual nodes.
- Event handling through virtual node attributes.
- State management through a reducer store.
- Routing through hash-based URL routes.

## Public Import

Use the public module when writing application code:

```js
import {
    createApp,
    createRouter,
    createStore,
    h,
} from "./src/framework/index.js";
```

`createVDOM()` creates virtual nodes.

## DOM Abstraction

Views return plain virtual node objects instead of writing HTML strings or
manually creating DOM nodes. A virtual node has a tag, attributes, and children:

```js
const buttonNode = {
    tag: "button",
    attrs: { className: "primary", type: "button" },
    children: ["Save"],
};
```

Children can be text, numbers, virtual nodes, or arrays of virtual nodes. `null`,
`undefined`, and `false` children are ignored, which makes conditional rendering
straightforward.

### Create And Nest Elements

```js
function WelcomeCard() {
    return createVDOM("section", { className: "card", id: "welcome" },
        createVDOM("h1", {}, "Welcome"),
        createVDOM("p", {}, "This element tree was created with virtual nodes."),
        createVDOM("ul", {},
            [
                createVDOM("li", {}, "DOM abstraction"),
                createVDOM("li", {}, "Events"),
                createVDOM("li", {}, "State"),
                createVDOM("li", {}, "Routing"),
            ],
        ),
    );
}
```

### Attributes

Common HTML attributes are passed through the `attrs` object:

```js
createVDOM("input", {
    id: "new-todo",
    name: "new-todo",
    className: "new-todo",
    type: "text",
    placeholder: "What needs to be done?",
    value: "Read the docs",
    autoFocus: true,
});
```

Notes:

- Use `className` to set `element.className`.
- Boolean attributes are written when `true` and removed when `false`.
- `value` and `checked` are applied as DOM properties so inputs stay in sync.
- `style` accepts an object and is assigned to `element.style`.

## Event Handling

Application code declares event handlers as virtual node attributes. The
framework normalizes names like `onClick`, `onInput`, `onChange`, `onKeyDown`,
and `onDblClick` to browser events internally.

```js
createVDOM("button", {
    type: "button",
    onClick: event => {
        event.preventDefault();
        console.log("Clicked through the framework event API");
    },
}, "Click me");
```

The app never needs to call `addEventListener()` directly. Internally, the
framework keeps one delegated event manager at the render root and stores
handlers against rendered elements. When a patch removes an event attribute or
replaces an element, the matching handler is removed.

## State Management

State is managed with a small reducer store:

```js
function counterReducer(state = { count: 0 }, action) {
    switch (action.type) {
        case "INCREMENT":
            return { ...state, count: state.count + 1 };
        case "RESET":
            return { ...state, count: 0 };
        default:
            return state;
    }
}

const store = createStore(counterReducer, { count: 0 });

store.subscribe(state => {
    console.log("State changed", state);
});

store.dispatch({ type: "INCREMENT" });
```

The public store API is:

- `store.getState()` returns the current state.
- `store.dispatch(action)` sends a plain action object to the reducer.
- `store.dispatch(thunk)` runs a function with `(dispatch, getState)`.
- `store.subscribe(listener)` listens for state changes and returns an unsubscribe function.
- `store.use(middleware)` registers simple action middleware.

Reducers should return new state objects instead of mutating the previous state.
`createApp()` subscribes to the store and schedules a render after state changes.

## Routing

The router maps hash paths to handlers:

```js
const router = createRouter({
    "/": () => store.dispatch({ type: "SET_PAGE", page: "home" }),
    "/todos": () => store.dispatch({ type: "SET_PAGE", page: "todos", filter: "all" }),
    "/active": () => store.dispatch({ type: "SET_PAGE", page: "todos", filter: "active" }),
    "/completed": () => store.dispatch({ type: "SET_PAGE", page: "todos", filter: "completed" }),
    "*": () => store.dispatch({ type: "SET_PAGE", page: "not-found" }),
});
```

Navigate with `router.navigate(path)`:

```js
createVDOM("a", {
    href: "#/todos",
    onClick: event => {
        event.preventDefault();
        router.navigate("/todos");
    },
}, "Todos");
```

The current app uses hash routes because the repository is served as static
files by a tiny Go server and TodoMVC filters work well as route-like URL state.
Back and forward navigation are handled through the browser hash change event.

Unknown routes throw unless a `*` fallback route is registered.

## App Lifecycle

Applications should mount through `createApp({ root, router, store, view })`:

```js
const app = createApp({
    root: document.getElementById("app"),
    router,
    store,
    view: state => createVDOM("main", {},
        createVDOM("h1", {}, "Counter"),
        createVDOM("button", {
            onClick: () => store.dispatch({ type: "INCREMENT" }),
        }, `Count: ${state.count}`),
    ),
});

app.mount();
```

The lifecycle owns the first render, subscribes to store and router changes, and
schedules one patch render per browser microtask. This keeps application code
focused on state, routes, and views instead of manually coordinating `render()`,
`patch()`, and subscriptions.

Common setup mistakes fail early:

- A missing root element throws from `createApp()`.
- A missing view function throws from `createApp()`.
- An invalid virtual node throws from the renderer.
- An unknown route throws from the router unless a `*` fallback route exists.

## Build A Tiny App

Create a new browser module and import the framework:

```js
import { createApp, createRouter, createStore, h } from "./src/framework/index.js";

function reducer(state = { message: "", page: "home" }, action) {
    switch (action.type) {
        case "SET_MESSAGE":
            return { ...state, message: action.message };
        case "SET_PAGE":
            return { ...state, page: action.page };
        default:
            return state;
    }
}

const store = createStore(reducer, { message: "", page: "home" });

const router = createRouter({
    "/": () => store.dispatch({ type: "SET_PAGE", page: "home" }),
    "/about": () => store.dispatch({ type: "SET_PAGE", page: "about" }),
});

function view(state) {
    return createVDOM("main", { className: "tiny-app" },
        createVDOM("nav", {},
            createVDOM("a", {
                href: "#/",
                onClick: event => {
                    event.preventDefault();
                    router.navigate("/");
                },
            }, "Home"),
            " ",
            createVDOM("a", {
                href: "#/about",
                onClick: event => {
                    event.preventDefault();
                    router.navigate("/about");
                },
            }, "About"),
        ),
        state.page === "home"
            ? createVDOM("label", {},
                "Message ",
                createVDOM("input", {
                    value: state.message,
                    onInput: event => store.dispatch({
                        type: "SET_MESSAGE",
                        message: event.target.value,
                    }),
                }),
            )
            : createVDOM("p", {}, "This page is rendered through the router."),
        createVDOM("p", {}, `Current message: ${state.message}`),
    );
}

createApp({
    root: document.getElementById("app"),
    router,
    store,
    view,
}).mount();
```

This tiny app demonstrates all four features: virtual nodes build the DOM,
`onInput` and `onClick` handle events, the store keeps shared state, and the
router controls which page is shown.

## How TodoMVC Uses The Framework

TodoMVC is the main integration surface for the project.

`src/todomvc/main.js` creates:

- A reducer store with `todos`, `editingTodoId`, `page`, and `filter`.
- A hash router for `#/`, `#/todos`, `#/active`, `#/completed`, and `#/about`.
- A mounted app lifecycle with `createApp()`.

`src/todomvc/views.js` builds the UI with virtual nodes:

- Todo creation uses the `new-todo` textarea and `onKeyDown`/`onInput` handlers.
- Single-todo toggling uses checkbox `onChange`.
- Toggle-all uses the `toggle-all` checkbox and matching `toggle-all-label`.
- Editing starts on `onDblClick`, commits on Enter or focus out, and cancels on Escape.
- Deletion and clearing completed todos dispatch reducer actions from `onClick`.
- Filters are links that call `router.navigate()` and update URL hash state.

The app preserves reference TodoMVC structure while still using framework
virtual nodes. Important classes and IDs include `todoapp`, `header`,
`new-todo`, `main`, `toggle-all`, `toggle-all-label`, `todo-list`, `todo`,
`completed`, `editing`, `toggle`, `destroy`, `edit`, `footer`, `todo-count`,
`filters`, `selected`, and `clear-completed`.

TodoMVC application code avoids raw DOM querying and manual listeners for app
behavior. DOM APIs are used inside the framework renderer and event manager,
where they are part of the framework implementation.

## Design Trade-Offs

The framework is intentionally small and readable.

- Virtual nodes are simple objects instead of compiled templates.
- Event handling is delegated at the root so patches do not need to attach many
  independent browser listeners.
- State follows reducer actions because TodoMVC behavior is easier to audit when
  every state transition has a named action.
- Routing uses hash paths, which keeps static serving simple and makes filter
  URLs work without server-side route rewrites.
- Rendering uses a small same-position patch algorithm. It updates attributes,
  text, and children without replacing the whole app on every state change, but
  it does not attempt advanced keyed reconciliation.

## API Reference

### `h(tag, attrs, ...children)`

Alias for `createVDOM()`. Creates a virtual node.

```js
h("p", { className: "note" }, "Hello");
```

### `createVDOM(tag, attrs, ...children)`

Creates a `VDOM` instance. Children are flattened and empty conditional values
are removed.

### `fragment(children)`

Flattens nested child arrays and removes `null`, `undefined`, and `false`.

### `render(vnode, container)`

Clears a container and renders a virtual node into it.

### `patch(parent, oldVNode, newVNode, index)`

Updates an existing DOM tree from an old virtual node to a new virtual node.
Most application code should let `createApp()` call this.

### `createApp({ root, router, store, view })`

Creates an app lifecycle. Call `.mount()` to render and subscribe to changes.
Call `.unmount()` to remove subscriptions and clear the root.

### `createStore(reducer, initialState)`

Creates a reducer store with `getState()`, `dispatch()`, `subscribe()`, and
`use()`.

### `combineReducers(reducers)`

Combines multiple keyed reducers into one reducer function.

### `createRouter(routes, store)`

Creates a hash router. Route handlers run when the hash changes or when
`router.navigate(path)` is called. If a store is passed, route changes also
dispatch a `ROUTE_CHANGE` action.

### `router.navigate(path)`

Changes the current hash route. `path` must be a string beginning with `/`.

### `on(element, type, handler)` and `off(element, type)`

Low-level event manager helpers exported for completeness. Application views
usually use `onClick`, `onInput`, and similar virtual node attributes instead.

## Auditor Checklist

From the repository root:

1. Run `npm start`.
2. Open [http://localhost:8000/](http://localhost:8000/).
3. Visit `#/todos`, create todos, edit them, toggle them, delete them, clear
   completed todos, and use `#/active` and `#/completed`.
4. Inspect the DOM and confirm TodoMVC reference classes and labels are present.
5. Run `npm test`.
6. Review `src/framework/` for the four required capabilities and
   `src/todomvc/` for the integration example.

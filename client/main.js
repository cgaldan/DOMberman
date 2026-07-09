import { createApp, h } from "../framework/index.js";
import { store } from "./store.js";
import { connect } from "./net.js";
import { handleKey, startInputLoop, focusApp } from "./input.js";
import { welcomeView } from "./views/welcome.js";
import { lobbyView } from "./views/lobby.js";
import { gameView } from "./views/game.js";

let lastStatus = null;

connect();

createApp({
    root: document.getElementById("app"),
    store,
    view,
}).mount();

store.subscribe(() => {
    const status = store.getState().server && store.getState().server.status;
    if (status !== lastStatus) {
        lastStatus = status;
        if (status === "playing") queueMicrotask(focusApp);
    }
});

startInputLoop();

setInterval(() => {
    const state = store.getState();
    if (state.joined && state.server && state.server.status !== "playing") {
        store.dispatch({ type: "TICK" });
    }
}, 500);

function view(state) {
    return h("main", {
        className: "app",
        tabIndex: 0,
        onKeyDown: event => handleKey(event, true),
        onKeyUp: event => handleKey(event, false),
    }, screen(state));
}

function screen(state) {
    if (!state.joined) {
        return welcomeView(state);
    }

    const server = state.server;
    if (server && (server.status === "playing" || server.status === "finished")) {
        return gameView(state);
    }

    return lobbyView(state);
}

import { store } from "./store.js";

const SESSION_KEY = "bomberman:session";

let socket = null;

export function connect() {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    socket = new WebSocket(`${protocol}://${location.host}`);

    socket.addEventListener("open", () => {
        store.dispatch({ type: "SOCKET_OPEN" });
        const session = loadSession();
        if (session && session.playerId && session.token) {
            send({ type: "rejoin", playerId: session.playerId, token: session.token });
        }
    });
    socket.addEventListener("close", () => {
        store.dispatch({ type: "SOCKET_CLOSED" });
        setTimeout(connect, 1500);
    });
    socket.addEventListener("error", () => store.dispatch({ type: "SET_ERROR", error: "Unable to reach the server." }));
    socket.addEventListener("message", event => handleServerMessage(event.data));
}

export function send(message) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(message));
}

function handleServerMessage(data) {
    let message;
    try {
        message = JSON.parse(data);
    } catch {
        return;
    }

    if (message.type === "server_state") {
        store.dispatch({ type: "SERVER_STATE", server: message });
    } else if (message.type === "joined") {
        saveSession({ playerId: message.playerId, token: message.token });
        store.dispatch({ type: "JOINED", playerId: message.playerId });
    } else if (message.type === "rejoin_failed") {
        clearSession();
        store.dispatch({ type: "REJOIN_FAILED" });
    } else if (message.type === "error") {
        store.dispatch({ type: "SET_ERROR", error: message.message });
    }
}

function loadSession() {
    try {
        return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch {
        return null;
    }
}

function saveSession(session) {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {}
}

function clearSession() {
    try {
        localStorage.removeItem(SESSION_KEY);
    } catch {}
}

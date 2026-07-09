import { store } from "./store.js";
import { send } from "./net.js";

const KEYS = {
    arrowup: "up",
    w: "up",
    arrowdown: "down",
    s: "down",
    arrowleft: "left",
    a: "left",
    arrowright: "right",
    d: "right",
};

let currentInput = emptyInput();
let pendingBomb = false;
let lastSentInput = "";

export function handleKey(event, pressed) {
    const key = event.key.toLowerCase();
    const tag = event.target && event.target.tagName;
    const inField = tag === "INPUT" || tag === "TEXTAREA";

    if (inField) {
        if (key === "escape" && pressed) {
            event.target.blur();
            focusApp();
        }
        return;
    }

    const state = store.getState();
    const playing = state.joined && state.server && state.server.status === "playing";
    if (!playing) return;

    if (key === "enter") {
        if (pressed) {
            currentInput = emptyInput();
            pendingBomb = false;
            focusChat();
        }
        event.preventDefault();
        return;
    }

    if (key === " ") {
        if (pressed) pendingBomb = true;
        event.preventDefault();
        return;
    }

    const flag = KEYS[key];
    if (!flag) return;

    currentInput[flag] = pressed;
    event.preventDefault();
}


export function startInputLoop() {
    requestAnimationFrame(frameLoop);
}

function frameLoop() {
    publishInput();
    requestAnimationFrame(frameLoop);
}

function publishInput() {
    const payload = { ...currentInput, dropBomb: pendingBomb };
    const serialized = JSON.stringify(payload);

    if (serialized !== lastSentInput) {
        send({ type: "input", input: payload });
        lastSentInput = serialized;
    }

    pendingBomb = false;
}

export function focusApp() {
    const main = document.querySelector(".app");
    if (main) main.focus();
}

function focusChat() {
    const input = document.querySelector(".chat-input");
    if (input) input.focus();
}

function emptyInput() {
    return { up: false, down: false, left: false, right: false };
}

import { h } from "../../framework/index.js";
import { store } from "../store.js";
import { send } from "../net.js";
import { focusApp } from "../input.js";

export function chatView(state) {
    const messages = (state.server && state.server.chat) || [];
    const myId = state.playerId;
    const inGame = Boolean(state.server && state.server.status === "playing");

    return h("div", { className: "chat" },
        h("h3", {}, "Chat"),
        h("div", { className: "chat-log" },
            messages.slice(-40).reverse().map(message => {
                const mine = message.playerId === myId;
                return h("div", { className: `chat-line${mine ? " mine" : ""}` },
                    h("span", { className: "chat-nick" }, mine ? "You: " : `${message.nickname}: `),
                    message.text,
                );
            }),
        ),
        h("form", {
            className: "chat-form",
            onSubmit: event => {
                event.preventDefault();
                sendChat();
            },
        },
            h("input", {
                className: "text-input chat-input",
                value: state.chatDraft,
                maxLength: "160",
                placeholder: inGame ? "Enter to send · Esc to game" : "Message",
                onInput: event => store.dispatch({ type: "SET_CHAT_DRAFT", text: event.target.value }),
            }),
            h("button", { type: "submit" }, "Send"),
        ),
    );
}

function sendChat() {
    const text = store.getState().chatDraft.trim();
    if (!text) return;

    send({ type: "chat", text });
    store.dispatch({ type: "CLEAR_CHAT_DRAFT" });

    const server = store.getState().server;
    if (server && server.status === "playing") {
        focusApp();
    }
}

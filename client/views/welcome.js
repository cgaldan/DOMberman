import { h } from "../../framework/index.js";
import { store } from "../store.js";
import { send } from "../net.js";

export function welcomeView(state) {
    return h("section", { className: "panel hero" },
        h("h1", {}, "Bomberman DOM"),
        h("p", { className: "status" }, "Enter a nickname to join the lobby."),
        h("form", {
            className: "form-row",
            onSubmit: event => {
                event.preventDefault();
                joinGame();
            },
        },
            h("input", {
                className: "text-input",
                value: state.nickname,
                maxLength: "20",
                placeholder: "Nickname",
                autoFocus: true,
                onInput: event => store.dispatch({ type: "SET_NICKNAME", nickname: event.target.value }),
            }),
            h("button", { type: "submit", disabled: !state.socketOpen },
                state.socketOpen ? "Join" : "Connecting..."),
        ),
        state.error ? h("p", { className: "error" }, state.error) : null,
    );
}

function joinGame() {
    const nickname = store.getState().nickname.trim();
    if (!nickname) {
        store.dispatch({ type: "SET_ERROR", error: "Enter a nickname to join." });
        return;
    }

    send({ type: "join", nickname });
}

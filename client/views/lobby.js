import { h } from "../../framework/index.js";
import { send } from "../net.js";
import { chatView } from "./chat.js";

export function lobbyView(state) {
    const server = state.server || { players: [], playerCount: 0, maxPlayers: 4, minPlayers: 2, status: "lobby" };
    const minPlayers = server.minPlayers || 2;
    const readyIn = countdownSeconds(server.countdownEndsAt);
    const waitIn = countdownSeconds(server.lobbyEndsAt);
    const canStartNow = server.status === "lobby" && server.playerCount >= minPlayers;
    const slots = Array.from({ length: server.maxPlayers }, (_, index) => server.players[index] || null);

    return h("section", { className: "panel lobby" },
        h("h1", {}, "Waiting Room"),
        h("p", { className: "status" }, `Players ${server.playerCount} / ${server.maxPlayers}`),
        readyIn !== null
            ? h("p", { className: "status highlight" }, `Starting in ${readyIn}s`)
            : waitIn !== null
                ? h("p", { className: "status" }, `Waiting for players… ${waitIn}s`)
                : h("p", { className: "status" }, "Starts at 4 players, or shortly after 2+ have joined."),
        canStartNow
            ? h("button", { onClick: () => send({ type: "start_now" }) }, "Start now")
            : null,
        h("div", { className: "player-list" },
            slots.map((player, index) => h("div", { className: "player-card" },
                player ? `${index + 1}. ${player.nickname}` : `${index + 1}. Empty`)),
        ),
        chatView(state),
        state.error ? h("p", { className: "error" }, state.error) : null,
    );
}

function countdownSeconds(endsAt) {
    if (!endsAt) return null;
    return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

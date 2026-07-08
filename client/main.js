import { createApp, createStore, h } from "../framework/index.js";
import { BOARD_HEIGHT, BOARD_WIDTH, TILE_SIZE } from "../shared/game.js";

const PLAYER_SIZE = 28;

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

const initialState = {
    nickname: "",
    joined: false,
    playerId: null,
    socketOpen: false,
    error: "",
    server: null,
    chatDraft: "",
};

const store = createStore(reducer, initialState);

let socket = null;
let currentInput = emptyInput();
let pendingBomb = false;
let lastSentInput = "";
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

requestAnimationFrame(frameLoop);

setInterval(() => {
    const state = store.getState();
    if (state.joined && state.server && state.server.status !== "playing") {
        store.dispatch({ type: "TICK" });
    }
}, 500);

function reducer(state = initialState, action) {
    switch (action.type) {
        case "SET_NICKNAME":
            return { ...state, nickname: action.nickname };
        case "SOCKET_OPEN":
            return { ...state, socketOpen: true, error: "" };
        case "SOCKET_CLOSED":
            return { ...state, socketOpen: false, error: "Disconnected from the server." };
        case "SET_ERROR":
            return { ...state, error: action.error };
        case "JOINED":
            return { ...state, joined: true, playerId: action.playerId, error: "" };
        case "SERVER_STATE":
            return { ...state, server: action.server };
        case "TICK":
            return { ...state };
        case "SET_CHAT_DRAFT":
            return { ...state, chatDraft: action.text };
        case "CLEAR_CHAT_DRAFT":
            return { ...state, chatDraft: "" };
        default:
            return state;
    }
}

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

function welcomeView(state) {
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

function lobbyView(state) {
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

function gameView(state) {
    const game = state.server.game;
    if (!game) {
        return h("section", { className: "panel" }, "Preparing game...");
    }

    const winner = game.winnerId && game.players.find(player => player.id === game.winnerId);

    return h("section", { className: "game-layout" },
        h("div", { className: "panel" },
            game.status === "finished"
                ? h("div", { className: "banner" },
                    h("span", {}, winner ? `${winner.nickname} wins!` : "Game over"),
                    h("button", { onClick: () => send({ type: "restart" }) }, "Play again"),
                )
                : null,
            h("div", { className: "board-wrap" },
                h("div", { className: "board", style: boardStyle() },
                    staticGrid(game),
                    entitiesLayer(game, state.playerId),
                ),
                h("aside", { className: "side-panel" },
                    scoreboard(game),
                    chatView(state),
                ),
            ),
        ),
    );
}

function boardStyle() {
    return {
        width: `${BOARD_WIDTH * TILE_SIZE}px`,
        height: `${BOARD_HEIGHT * TILE_SIZE}px`,
    };
}

function staticGrid(game) {
    return h("div", {
        className: "static-grid",
        style: {
            gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${TILE_SIZE}px)`,
            gridTemplateRows: `repeat(${BOARD_HEIGHT}, ${TILE_SIZE}px)`,
        },
    }, boardCells(game));
}

function boardCells(game) {
    return game.map.tiles.map(tile => h("div", { className: `cell ${tile}` }));
}

function entitiesLayer(game, myId) {
    return h("div", { className: "entities-layer" },
        playerViews(game, myId),
        powerUpViews(game),
        bombViews(game),
        explosionViews(game),
    );
}

function playerViews(game, myId) {
    return game.players.map(player => {
        const className = `entity player-${player.index}`
            + (player.eliminated ? " eliminated" : "")
            + (player.id === myId ? " me" : "");

        return h("div", {
            className,
            style: entityStyle(player.x, player.y),
            title: player.nickname,
        }, player.eliminated ? "✕" : player.nickname.slice(0, 1).toUpperCase());
    });
}

function powerUpViews(game) {
    return (game.map.powerUps || []).map(powerUp => h("div", {
        className: `entity power-up power-${powerUp.type}`,
        style: entityStyle(powerUp.x, powerUp.y),
        title: powerUp.type,
    }, powerUpLabel(powerUp.type)));
}

function powerUpLabel(type) {
    if (type === "bomb") return "B";
    if (type === "flame") return "F";
    return "S";
}

function bombViews(game) {
    return game.bombs.map(bomb => h("div", {
        className: "entity bomb",
        style: entityStyle(bomb.x, bomb.y),
    }));
}

function explosionViews(game) {
    return game.explosions.flatMap(explosion => explosion.tiles.map(tile => h("div", {
        className: "entity explosion",
        style: tileStyle(tile.x, tile.y),
    })));
}

function scoreboard(game) {
    return h("div", { className: "scoreboard-overlay" },
        h("h3", {}, "Players"),
        game.players.map(player => h("div", { className: "score-row" },
            h("span", { className: "score-player" }, player.nickname),
            h("span", { className: "score-lives" }, player.eliminated ? "Out" : `${player.lives} lives`),
        )),
    );
}

function chatView(state) {
    const messages = (state.server && state.server.chat) || [];
    const myId = state.playerId;

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
                placeholder: "Message",
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

function entityStyle(x, y) {
    const offset = (TILE_SIZE - PLAYER_SIZE) / 2;
    return {
        width: `${PLAYER_SIZE}px`,
        height: `${PLAYER_SIZE}px`,
        transform: `translate(${x * TILE_SIZE + offset}px, ${y * TILE_SIZE + offset}px)`,
    };
}

function tileStyle(x, y) {
    return {
        width: `${TILE_SIZE}px`,
        height: `${TILE_SIZE}px`,
        transform: `translate(${x * TILE_SIZE}px, ${y * TILE_SIZE}px)`,
    };
}

function handleKey(event, pressed) {
    // Never treat keys typed inside a text field (chat/nickname) as movement.
    const tag = event.target && event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    const state = store.getState();
    const playing = state.joined && state.server && state.server.status === "playing";
    if (!playing) return;

    const key = event.key.toLowerCase();

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

function joinGame() {
    const nickname = store.getState().nickname.trim();
    if (!nickname) {
        store.dispatch({ type: "SET_ERROR", error: "Enter a nickname to join." });
        return;
    }

    send({ type: "join", nickname });
}

function connect() {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    socket = new WebSocket(`${protocol}://${location.host}`);

    socket.addEventListener("open", () => store.dispatch({ type: "SOCKET_OPEN" }));
    socket.addEventListener("close", () => {
        store.dispatch({ type: "SOCKET_CLOSED" });
        setTimeout(connect, 1500);
    });
    socket.addEventListener("error", () => store.dispatch({ type: "SET_ERROR", error: "Unable to reach the server." }));
    socket.addEventListener("message", event => handleServerMessage(event.data));
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
        store.dispatch({ type: "JOINED", playerId: message.playerId });
    } else if (message.type === "error") {
        store.dispatch({ type: "SET_ERROR", error: message.message });
    }
}

function send(message) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(message));
}

function focusApp() {
    const main = document.querySelector(".app");
    if (main) main.focus();
}

function emptyInput() {
    return { up: false, down: false, left: false, right: false };
}

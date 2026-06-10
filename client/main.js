import { h, render, patch } from "../framework/index.js";
import {
    BOARD_HEIGHT,
    BOARD_WIDTH,
    TILE_SIZE,
    createGame,
    movePlayer,
} from "../shared/game.js";

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

const playerMeta = { id: "0", nickname: "You" };

let game = createGame([playerMeta]);

const input = emptyInput();
let lastFrameAt = null;

const root = document.getElementById("app");

let boardEl;
let prevEntities;

mountGame();
focusBoard();
requestAnimationFrame(frame);

function mountGame() {
    prevEntities = entitiesLayer(game);

    const tree = h("main", {
        className: "app",
        tabIndex: 0,
        onKeyDown: event => handleKey(event, true),
        onKeyUp: event => handleKey(event, false),
    }, gameView());

    render(tree, root);
    boardEl = root.querySelector(".board");
}

function handleKey(event, pressed) {
    const flag = KEYS[event.key.toLowerCase()];
    if (!flag) return;

    event.preventDefault();
    input[flag] = pressed;
}

function frame(now) {
    const deltaMs = lastFrameAt === null ? 0 : now - lastFrameAt;
    lastFrameAt = now;

    if (movePlayer(game, game.players[0], input, deltaMs)) {
        const nextEntities = entitiesLayer(game);
        patch(boardEl, prevEntities, nextEntities, 1);
        prevEntities = nextEntities;
    }

    requestAnimationFrame(frame);
}

function emptyInput() {
    return { up: false, down: false, left: false, right: false };
}

function focusBoard() {
    const main = root.querySelector(".app");
    if (main) main.focus();
}

function gameView() {
    return h("section", { className: "game-layout"},
        h("div", { className: "panel" },
            h("div", { className: "board-wrap" },
                h("div", {
                    className: "board",
                    style: {
                        width: `${BOARD_WIDTH * TILE_SIZE}px`,
                        height: `${BOARD_HEIGHT * TILE_SIZE}px`,
                    },
                },
                staticGrid(game),
                prevEntities,
            ),
        ),
    ));
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

function entitiesLayer(game) {
    return h("div", { className: "entities-layer" }, playerViews(game));
}

function boardCells(game) {
    return game.map.tiles.map(tile => h("div", {
        className: `cell ${tile}`,
        style: {
            width: `${TILE_SIZE}px`,
            height: `${TILE_SIZE}px`,
        },
    }));
}

function playerViews(game) {
    return game.players.map(player => h("div", {
        className: `entity player-${player.id}`,
        style: entityStyle(player.x, player.y),
        title: player.nickname,
    }, player.nickname.slice(0, 1).toUpperCase()));
}

function entityStyle(x, y) {
    return {
        width: `${TILE_SIZE}px`,
        height: `${TILE_SIZE}px`,
        left: `${x * TILE_SIZE}px`,
        top: `${y * TILE_SIZE}px`,
    };
}

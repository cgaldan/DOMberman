import { h, render, patch } from "../framework/index.js";
import {
    BOARD_HEIGHT,
    BOARD_WIDTH,
    TILE_SIZE,
    createGame,
    movePlayer,
    placeBomb,
    updateExplosives,
} from "../shared/game.js";

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

const playerMeta = { id: "0", nickname: "You" };

let game = createGame([playerMeta]);

const input = emptyInput();
let pendingBomb = false;
let lastFrameAt = null;

const root = document.getElementById("app");

let boardEl;
let prevStatic;
let prevEntities;

mountGame();
focusBoard();
requestAnimationFrame(frame);

function mountGame() {
    prevStatic = staticGrid(game);
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
    const key = event.key.toLowerCase();

    if (key === " ") {
        if (pressed) pendingBomb = true;
        event.preventDefault();
        return;
    }

    const flag = KEYS[key];
    if (!flag) return;

    event.preventDefault();
    input[flag] = pressed;
}

function frame(now) {
    const deltaMs = lastFrameAt === null ? 0 : now - lastFrameAt;
    lastFrameAt = now;

    let changed = false;

    if (pendingBomb) {
        if (placeBomb(game, game.players[0].id, now)) {
            changed = true;
        }
        pendingBomb = false;
    }

    if (movePlayer(game, game.players[0], input, deltaMs)) {
        changed = true;
    }

    const explosives = updateExplosives(game, now);
    if (explosives.changed) {
        changed = true;
    }

    if (explosives.mapChanged) {
        refreshStaticGrid();
    }

    if (changed) {
        const nextEntities = entitiesLayer(game);
        patch(boardEl, prevEntities, nextEntities, 1);
        prevEntities = nextEntities;
    }

    requestAnimationFrame(frame);
}

function refreshStaticGrid() {
    const nextStatic = staticGrid(game);
    patch(boardEl, prevStatic, nextStatic, 0);
    prevStatic = nextStatic;
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
                prevStatic,
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
    return h("div", { className: "entities-layer" },
        playerViews(game),
        bombViews(game),
        explosionViews(game),
    );
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

function tileStyle(x, y) {
    return {
        width: `${TILE_SIZE}px`,
        height: `${TILE_SIZE}px`,
        transform: `translate(${x * TILE_SIZE}px, ${y * TILE_SIZE}px)`,
    };
}

function entityStyle(x, y) {
    const offset = (TILE_SIZE - PLAYER_SIZE) / 2;
    return {
        width: `${PLAYER_SIZE}px`,
        height: `${PLAYER_SIZE}px`,
        transform: `translate(${x * TILE_SIZE + offset}px, ${y * TILE_SIZE + offset}px)`,
    };
}

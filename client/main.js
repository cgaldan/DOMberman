import { createApp, h } from "../framework/index.js";
import {
    BOARD_HEIGHT,
    BOARD_WIDTH,
    TILE_SIZE,
    createGame,
} from "../shared/game.js";

const playerMeta = { id: "0", nickname: "You" };

let game = createGame([playerMeta]);

createApp({
    root: document.getElementById("app"),
    view,
}).mount();

function view() {
    const player = game.players[0];
    return h("main", {
        className: "app",
    }, gameView(player));
}

function gameView() {
    return h("section", { className: "game-layout"},
        h("div", { className: "panel" },
            h("div", { className: "board-wrap" },
                h("div", { 
                    className: "board",
                    style: {
                        gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${TILE_SIZE}px)`,
                        gridTemplateRows: `repeat(${BOARD_HEIGHT}, ${TILE_SIZE}px)`,
                        width: `${BOARD_WIDTH * TILE_SIZE}px`,
                        height: `${BOARD_HEIGHT * TILE_SIZE}px`,
                    },
                },
                boardCells(game),
                playerViews(game),
            ),
        ),
    ));
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

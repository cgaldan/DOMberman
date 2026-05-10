import { createApp, h } from "../framework/index.js";
import { BOARD_HEIGHT, BOARD_WIDTH, TILE_SIZE, createGame } from "../shared/game.js";

const game = createGame();

createApp({
    root: document.getElementById("app"),
    view,
}).mount();

function view() {
    return h("main", {
        className: "app",
    }, gameView());
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
                game.map.tiles.map(tile => h("div", {
                    className: `cell ${tile}`,
                    style: {
                        width: `${TILE_SIZE}px`,
                        height: `${TILE_SIZE}px`,
                    },
                })),
            ),
        ),
    ));
}
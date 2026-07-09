import { h } from "../../framework/index.js";
import { BOARD_HEIGHT, BOARD_WIDTH, TILE_SIZE } from "../../shared/game.js";
import { send } from "../net.js";
import { chatView } from "./chat.js";

const PLAYER_SIZE = 28;

export function gameView(state) {
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

let staticGridCache = { key: null, vnode: null };

function staticGrid(game) {
    const key = game.map.tiles.join(",");
    if (key !== staticGridCache.key) {
        staticGridCache = {
            key,
            vnode: h("div", {
                className: "static-grid",
                style: {
                    gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${TILE_SIZE}px)`,
                    gridTemplateRows: `repeat(${BOARD_HEIGHT}, ${TILE_SIZE}px)`,
                },
            }, boardCells(game)),
        };
    }

    return staticGridCache.vnode;
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
        const disconnected = player.connected === false && !player.eliminated;
        const className = `entity player-${player.index}`
            + (player.eliminated ? " eliminated" : "")
            + (disconnected ? " disconnected" : "")
            + (player.id === myId ? " me" : "");

        const label = player.eliminated || disconnected
            ? "✕"
            : player.nickname.slice(0, 1).toUpperCase();

        return h("div", {
            className,
            style: entityStyle(player.x, player.y),
            title: disconnected ? `${player.nickname} (away)` : player.nickname,
        }, label);
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
    if (type === "bomb") return "💣";
    if (type === "flame") return "🔥";
    if (type === "life") return "❤️";
    if (type === "bombpass") return "🟣";
    return "⚡";
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

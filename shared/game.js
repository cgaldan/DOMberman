export * from "./constants.js";
export * from "./map.js";
export * from "./movement.js";
export * from "./powerups.js";
export * from "./player.js";
export * from "./bombs.js";

import { MIN_PLAYERS, SERVER_TICK_MS } from "./constants.js";
import { createMap } from "./map.js";
import { createPlayer } from "./player.js";
import { movePlayer } from "./movement.js";
import { collectPowerUp } from "./powerups.js";
import { placeBomb, updateExplosives } from "./bombs.js";

export function createGame(players) {
    const map = createMap();
    const now = Date.now();

    return {
        status: "playing",
        map,
        players: players.map((player, index) => createPlayer(player, index)),
        bombs: [],
        explosions: [],
        winnerId: null,
        startedAt: now,
        updatedAt: now,
    };
}

export function tickGame(game, inputs = {}, now = Date.now(), deltaMs = SERVER_TICK_MS) {
    if (!game || game.status !== "playing") {
        return game;
    }

    game.updatedAt = now;

    for (const player of game.players) {
        if (player.eliminated || !player.alive) {
            continue;
        }

        if (player.invulnerable > 0) {
            player.invulnerable = Math.max(0, player.invulnerable - deltaMs);
        }

        const input = inputs[player.id] || {};

        if (input.dropBomb) {
            placeBomb(game, player.id, now);
        }

        movePlayer(game, player, input, deltaMs);
        collectPowerUp(game, player);
    }

    updateExplosives(game, deltaMs);
    updateWinner(game);

    return game;
}

function updateWinner(game) {
    const remaining = game.players.filter(player => !player.eliminated);

    if (game.players.length >= MIN_PLAYERS && remaining.length <= 1) {
        game.status = "finished";
        game.winnerId = remaining.length === 1 ? remaining[0].id : null;
    }
}

export function serializeGame(game) {
    if (!game) {
        return null;
    }

    return {
        status: game.status,
        map: game.map,
        players: game.players,
        bombs: game.bombs,
        explosions: game.explosions,
        winnerId: game.winnerId,
        updatedAt: game.updatedAt,
    };
}

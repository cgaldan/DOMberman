import { SPAWNS, STARTING_LIVES, BASE_SPEED, STARTING_BOMBS, STARTING_FLAMES } from "./constants.js";
import { spawnRandomPowerUp } from "./powerups.js";

export function createPlayer(player, index = 0) {
    const spawn = SPAWNS[index] || SPAWNS[0];
    return {
        id: player.id,
        nickname: player.nickname,
        index,
        x: spawn.x,
        y: spawn.y,
        spawnX: spawn.x,
        spawnY: spawn.y,
        lives: STARTING_LIVES,
        speed: BASE_SPEED,
        bombsAvailable: STARTING_BOMBS,
        flameRange: STARTING_FLAMES,
        alive: true,
        eliminated: false,
        invulnerable: 0,
        connected: true,
        bombPass: false,
    };
}

export function applyExplosionDamage(game = {}) {
    let changed = false;

    for (const player of game.players) {
        if (player.eliminated || player.invulnerable > 0 || !player.connected) continue;

        const playerTile = { x: Math.round(player.x), y: Math.round(player.y) };
        const hit = game.explosions.some(explosion => explosion.tiles.some(tile => tile.x === playerTile.x && tile.y === playerTile.y));
        if (!hit) continue;

        changed = true;
        player.lives -= 1;
        spawnRandomPowerUp(game, playerTile.x, playerTile.y);
        if (player.lives <= 0) {
            player.alive = false;
            player.eliminated = true;
            continue;
        }

        player.x = player.spawnX;
        player.y = player.spawnY;
        player.invulnerable = 1200;
    }

    return changed;
}

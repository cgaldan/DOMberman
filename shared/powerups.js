import { POWER_UP_CHANCE, POWER_UPS, BASE_SPEED } from "./constants.js";

export function maybeSpawnPowerUp(game, x, y) {
    if (Math.random() > POWER_UP_CHANCE) {
        return;
    }

    spawnRandomPowerUp(game, x, y);
}

export function spawnRandomPowerUp(game, x, y) {
    const types = [POWER_UPS.BOMB, POWER_UPS.FLAME, POWER_UPS.SPEED, POWER_UPS.LIFE, POWER_UPS.BOMB_PASS];
    const type = types[Math.floor(Math.random() * types.length)];
    game.map.powerUps.push({ type, x, y });
}

export function collectPowerUp(game, player) {
    const x = Math.round(player.x);
    const y = Math.round(player.y);
    const index = game.map.powerUps.findIndex(powerUp => powerUp.x === x && powerUp.y === y);
    if (index === -1) {
        return false;
    }

    const [powerUp] = game.map.powerUps.splice(index, 1);

    if (powerUp.type === POWER_UPS.BOMB) {
        player.bombsAvailable += 1;
    } else if (powerUp.type === POWER_UPS.FLAME) {
        player.flameRange += 1;
    } else if (powerUp.type === POWER_UPS.SPEED) {
        player.speed = Math.min(player.speed + 1, BASE_SPEED + 4);
    } else if (powerUp.type === POWER_UPS.LIFE) {
        player.lives += 1;
    } else if (powerUp.type === POWER_UPS.BOMB_PASS) {
        player.bombPass = true;
    }

    return true;
}

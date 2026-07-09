import { BOMB_FUSE_MS, EXPLOSION_MS, SERVER_TICK_MS, TILE } from "./constants.js";
import { getTile, setTile } from "./map.js";
import { maybeSpawnPowerUp } from "./powerups.js";
import { applyExplosionDamage } from "./player.js";

export function placeBomb(game, playerId, now = Date.now()) {
    const player = game.players.find(candidate => candidate.id === playerId);
    if (!player) {
        return null;
    }

    const activeBombs = game.bombs.filter(bomb => bomb.ownerId === playerId).length;
    if (activeBombs >= player.bombsAvailable) {
        return null;
    }

    const x = Math.round(player.x);
    const y = Math.round(player.y);
    if (game.bombs.some(bomb => bomb.x === x && bomb.y === y)) {
        return null;
    }

    const bomb = {
        id: `${playerId}-${now}-${game.bombs.length}`,
        ownerId: playerId,
        x,
        y,
        range: player.flameRange,
        fuse: BOMB_FUSE_MS,
    };

    game.bombs.push(bomb);
    return bomb;
}

export function updateExplosives(game, deltaMs = SERVER_TICK_MS) {
    let changed = false;
    let mapChanged = false;

    for (const bomb of [...game.bombs]) {
        bomb.fuse -= deltaMs;
        if (bomb.fuse <= 0) {
            const explosion = detonateBomb(game, bomb);
            changed = true;
            if (explosion && explosion.destroyedBlocks.length > 0) {
                mapChanged = true;
            }
        }
    }

    if (applyExplosionDamage(game)) {
        changed = true;
    }

    for (const explosion of game.explosions) {
        explosion.life -= deltaMs;
    }

    const remaining = game.explosions.filter(explosion => explosion.life > 0);
    if (remaining.length !== game.explosions.length) {
        game.explosions = remaining;
        changed = true;
    }

    return { changed, mapChanged };
}

export function detonateBomb(game, bomb) {
    const index = game.bombs.findIndex(candidate => candidate.id === bomb.id);
    if (index === -1) {
        return null;
    }

    game.bombs.splice(index, 1);

    const tiles = computeBlastTiles(game.map, bomb.x, bomb.y, bomb.range);
    const destroyedBlocks = [];

    for (const tile of tiles) {
        if (getTile(game.map, tile.x, tile.y) === TILE.BLOCK) {
            setTile(game.map, tile.x, tile.y, TILE.FLOOR);
            destroyedBlocks.push(tile);
            maybeSpawnPowerUp(game, tile.x, tile.y);
        }
    }

    const explosion = {
        id: `explosion-${bomb.id}`,
        ownerId: bomb.ownerId,
        tiles,
        destroyedBlocks,
        life: EXPLOSION_MS,
    };

    game.explosions.push(explosion);
    return explosion;
}

export function computeBlastTiles(map, originX, originY, range) {
    const tiles = [{ x: originX, y: originY }];
    const directions = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
    ];

    for (const direction of directions) {
        for (let distance = 1; distance <= range; distance++) {
            const x = originX + direction.x * distance;
            const y = originY + direction.y * distance;

            const tile = getTile(map, x, y);
            if (tile === TILE.WALL) {
                break;
            }

            tiles.push({ x, y });

            if (tile === TILE.BLOCK) {
                break;
            }
        }
    }

    return tiles;
}

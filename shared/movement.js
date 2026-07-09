import { BOARD_WIDTH, BOARD_HEIGHT, COLLISION_MARGIN, TILE } from "./constants.js";
import { getTile } from "./map.js";

export function movePlayer(game, player, input = {}, deltaMs = 0) {
    const direction = normalizeDirection(input);
    if (!direction.x && !direction.y) {
        return false;
    }

    const distance = player.speed * (deltaMs / 1000);
    const passableBombs = player.bombPass
        ? new Set(game.bombs.map(bomb => tileKey(bomb.x, bomb.y)))
        : bombsUnderPlayer(game, player);
    let moved = false;

    if (direction.x) {
        moved = moveAxis(game, player, "x", direction.x * distance, passableBombs) || moved;
    }

    if (direction.y) {
        moved = moveAxis(game, player, "y", direction.y * distance, passableBombs) || moved;
    }

    return moved;
}

function moveAxis(game, player, axis, delta, passableBombs) {
    const limit = (axis === "x" ? BOARD_WIDTH : BOARD_HEIGHT) - 2;
    const target = clamp(player[axis] + delta, 1, limit);

    if (canStand(game, withAxis(player, axis, target), passableBombs)) {
        player[axis] = target;
        return true;
    }

    return false;
}

function withAxis(point, axis, value) {
    return axis === "x" ? { x: value, y: point.y } : { x: point.x, y: value };
}

function canStand(game, { x, y }, passableBombs) {
    for (const tile of coveredTiles(x, y)) {
        if (getTile(game.map, tile.x, tile.y) !== TILE.FLOOR) {
            return false;
        }

        if (hasBomb(game, tile.x, tile.y) && !passableBombs.has(tileKey(tile.x, tile.y))) {
            return false;
        }
    }

    return true;
}

function coveredTiles(x, y) {
    const tiles = [];
    const left = Math.floor(x + COLLISION_MARGIN);
    const right = Math.floor(x + 1 - COLLISION_MARGIN);
    const top = Math.floor(y + COLLISION_MARGIN);
    const bottom = Math.floor(y + 1 - COLLISION_MARGIN);

    for (let tileY = top; tileY <= bottom; tileY++) {
        for (let tileX = left; tileX <= right; tileX++) {
            tiles.push({ x: tileX, y: tileY });
        }
    }

    return tiles;
}

function bombsUnderPlayer(game, player) {
    const passable = new Set();

    for (const tile of coveredTiles(player.x, player.y)) {
        if (hasBomb(game, tile.x, tile.y)) {
            passable.add(tileKey(tile.x, tile.y));
        }
    }

    return passable;
}

function hasBomb(game, x, y) {
    return game.bombs.some(bomb => bomb.x === x && bomb.y === y);
}

function tileKey(x, y) {
    return `${x},${y}`;
}

function normalizeDirection(input) {
    const x = Number(Boolean(input.right)) - Number(Boolean(input.left));
    const y = Number(Boolean(input.down)) - Number(Boolean(input.up));

    if (x && y) {
        const diagonal = Math.SQRT1_2;
        return { x: x * diagonal, y: y * diagonal };
    }

    return { x, y };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

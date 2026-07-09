import { BOARD_WIDTH, BOARD_HEIGHT, TILE, SPAWNS } from "./constants.js";

export function createMap() {
    const tiles = [];

    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (isWall(x, y)) {
                tiles.push(TILE.WALL);
            } else if (isSpawnSafeTile(x, y)) {
                tiles.push(TILE.FLOOR);
            } else {
                tiles.push(Math.random() < 0.66 ? TILE.BLOCK : TILE.FLOOR);
            }
        }
    }

    return { width: BOARD_WIDTH, height: BOARD_HEIGHT, tiles, powerUps: [] };
}

export function getTile(map, x, y) {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
        return TILE.WALL;
    }

    return map.tiles[y * map.width + x];
}

export function setTile(map, x, y, tile) {
    map.tiles[y * map.width + x] = tile;
}

function isWall(x, y) {
    return x === 0 || y === 0 || x === BOARD_WIDTH - 1 || y === BOARD_HEIGHT - 1 || (x % 2 === 0 && y % 2 === 0);
}

function isSpawnSafeTile(x, y) {
    return SPAWNS.some(spawn => Math.abs(spawn.x - x) + Math.abs(spawn.y - y) <= 2);
}

export const TILE_SIZE = 36;
export const BOARD_WIDTH = 15;
export const BOARD_HEIGHT = 13;
export const BASE_SPEED = 5;

export const TILE = {
    FLOOR: "floor",
    WALL: "wall",
    BLOCK: "block",
};

export const SPAWNS = [
    { x: 1, y: 1 }
];

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

    return { width: BOARD_WIDTH, height: BOARD_HEIGHT, tiles };
}

export function createGame(players) {
    const map = createMap();
    const now = Date.now();

    return {
        status: "playing",
        map,
        players: players.map(player => createPlayer(player)),
        startedAt: now,
        updatedAt: now,
    };
}

export function createPlayer(player) {
    const spawn = SPAWNS[0];
    return {
        id: player.id,
        nickname: player.nickname,
        x: spawn.x,
        y: spawn.y,
        spawnX: spawn.x,
        spawnY: spawn.y,
        speed: BASE_SPEED,
    };
}


export function movePlayer(game, player, input = {}, deltaMs = 0) {
    const direction = normalizeDirection(input);
    if (!direction.x && !direction.y) {
        return false;
    }
    
    const distance = player.speed * (deltaMs / 1000);
    const nextX = clamp(player.x + direction.x * distance, 1, BOARD_WIDTH - 2);
    const nextY = clamp(player.y + direction.y * distance, 1, BOARD_HEIGHT - 2);
    let moved = false;
    
    if (canMove(game.map, Math.round(nextX), Math.round(player.y))) {
        player.x = nextX;
        moved = true;
    }
    
    if (canMove(game.map, Math.round(player.x), Math.round(nextY))) {
        player.y = nextY;
        moved = true;
    }
    
    return moved;
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

export function getTile(map, x, y) {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
        return TILE.WALL;
    }
    
    return map.tiles[y * map.width + x];
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function isWall(x, y) {
    return x === 0 || y === 0 || x === BOARD_WIDTH - 1 || y === BOARD_HEIGHT - 1 || (x % 2 === 0 && y % 2 === 0);
}

function isSpawnSafeTile(x, y) {
    return SPAWNS.some(spawn => Math.abs(spawn.x - x) + Math.abs(spawn.y - y) <= 2);
}

export function canMove(map, x, y) {
    return getTile(map, x, y) === TILE.FLOOR;
}
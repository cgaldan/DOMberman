export const TILE_SIZE = 36;
export const BOARD_WIDTH = 15;
export const BOARD_HEIGHT = 13;

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
    };
}

function isWall(x, y) {
    return x === 0 || y === 0 || x === BOARD_WIDTH - 1 || y === BOARD_HEIGHT - 1 || (x % 2 === 0 && y % 2 === 0);
}

function isSpawnSafeTile(x, y) {
    return SPAWNS.some(spawn => Math.abs(spawn.x - x) + Math.abs(spawn.y - y) <= 2);
}
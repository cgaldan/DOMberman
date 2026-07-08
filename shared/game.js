export const TILE_SIZE = 36;
export const BOARD_WIDTH = 15;
export const BOARD_HEIGHT = 13;
export const STARTING_LIVES = 3;
export const BASE_SPEED = 5;
export const COLLISION_MARGIN = 0.1;
export const STARTING_BOMBS = 1;
export const STARTING_FLAMES = 1;
export const BOMB_FUSE_MS = 2200;
export const EXPLOSION_MS = 650;
export const POWER_UP_CHANCE = 0.15;

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const SERVER_TICK_MS = 16;
export const SNAPSHOT_MS = 16;
export const LOBBY_WAIT_MS = 20000;
export const READY_COUNTDOWN_MS = 10000;

export const TILE = {
    FLOOR: "floor",
    WALL: "wall",
    BLOCK: "block",
};

export const POWER_UPS = {
    BOMB: "bomb",
    FLAME: "flame",
    SPEED: "speed",
};

export const SPAWNS = [
    { x: 1, y: 1 },
    { x: BOARD_WIDTH - 2, y: BOARD_HEIGHT - 2 },
    { x: BOARD_WIDTH - 2, y: 1 },
    { x: 1, y: BOARD_HEIGHT - 2 },
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

    return { width: BOARD_WIDTH, height: BOARD_HEIGHT, tiles, powerUps: [] };
}

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

export function movePlayer(game, player, input = {}, deltaMs = 0) {
    const direction = normalizeDirection(input);
    if (!direction.x && !direction.y) {
        return false;
    }
    
    const distance = player.speed * (deltaMs / 1000);
    const passableBombs = bombsUnderPlayer(game, player);
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

function maybeSpawnPowerUp(game, x, y) {
    if (Math.random() > POWER_UP_CHANCE) {
        return;
    }

    const types = [POWER_UPS.BOMB, POWER_UPS.FLAME, POWER_UPS.SPEED];
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
    }

    return true;
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

export function setTile(map, x, y, tile) {
    map.tiles[y * map.width + x] = tile;
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
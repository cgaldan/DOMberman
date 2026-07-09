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
    LIFE: "life",
    BOMB_PASS: "bombpass",
};

export const SPAWNS = [
    { x: 1, y: 1 },
    { x: BOARD_WIDTH - 2, y: BOARD_HEIGHT - 2 },
    { x: BOARD_WIDTH - 2, y: 1 },
    { x: 1, y: BOARD_HEIGHT - 2 },
];

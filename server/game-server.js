import { WebSocketServer } from "ws";
import {
    LOBBY_WAIT_MS,
    MAX_PLAYERS,
    MIN_PLAYERS,
    READY_COUNTDOWN_MS,
    SERVER_TICK_MS,
    SNAPSHOT_MS,
    createGame,
    serializeGame,
    tickGame,
} from "../shared/game.js";

export class BombermanServer {
    constructor({
        lobbyWaitMs = LOBBY_WAIT_MS,
        readyCountdownMs = READY_COUNTDOWN_MS,
        tickMs = SERVER_TICK_MS,
        snapshotMs = SNAPSHOT_MS,
        seed = Date.now(),
    } = {}) {
        this.lobbyWaitMs = lobbyWaitMs;
        this.readyCountdownMs = readyCountdownMs;
        this.tickMs = tickMs;
        this.snapshotMs = snapshotMs;
        this.seed = seed;
        this.clients = new Map();
        this.players = [];
        this.inputs = {};
        this.chat = [];
        this.status = "lobby";
        this.countdownEndsAt = null;
        this.game = null;
        this.lobbyTimer = null;
        this.countdownTimer = null;
        this.tickTimer = null;
        this.snapshotTimer = null;
        this.lastTickAt = Date.now();
    }

    attach(server) {
        this.wss = new WebSocketServer({ server });
        this.wss.on("connection", socket => this.addClient(socket));
        return this.wss;
    }

    addClient(socket) {
        this.clients.set(socket, { socket, playerId: null });
        socket.on("message", data => this.handleRawMessage(socket, data));
        socket.on("close", () => this.removeClient(socket));
        socket.on("error", () => this.removeClient(socket));
        this.send(socket, "server_state", this.createSnapshot());
    }

    handleRawMessage(socket, data) {
        try {
            const message = JSON.parse(String(data));
            this.handleMessage(socket, message);
        } catch {
            this.send(socket, "error", { message: "Invalid message." });
        }
    }

    handleMessage(socket, message) {
        if (!message || typeof message.type !== "string") {
            this.send(socket, "error", { message: "Invalid message type." });
            return;
        }

        if (message.type === "join") {
            this.join(socket, message.nickname);
        } else if (message.type === "input") {
            this.updateInput(socket, message.input);
        } else if (message.type === "chat") {
            this.addChat(socket, message.text);
        } else if (message.type === "restart") {
            this.restartIfFinished();
        }
    }

    join(socket, nickname) {
        const client = this.clients.get(socket);
        if (!client) return;

        if (client.playerId) {
            this.send(socket, "error", { message: "You already joined this room." });
            return;
        }

        if (this.status !== "lobby" && this.status !== "countdown") {
            this.send(socket, "error", { message: "A game is already in progress." });
            return;
        }

        if (this.players.length >= MAX_PLAYERS) {
            this.send(socket, "error", { message: "Room is full." });
            return;
        }

        const cleanNickname = sanitizeNickname(nickname);
        if (!cleanNickname) {
            this.send(socket, "error", { message: "Enter a nickname to join." });
            return;
        }

        if (this.players.some(player => player.nickname.toLowerCase() === cleanNickname.toLowerCase())) {
            this.send(socket, "error", { message: "That nickname is already taken." });
            return;
        }

        const player = {
            id: `p${Date.now()}${Math.random().toString(16).slice(2)}`,
            nickname: cleanNickname,
            connected: true,
        };

        client.playerId = player.id;
        this.players.push(player);
        this.inputs[player.id] = {};
        this.scheduleLobbyTimers();
        this.send(socket, "joined", { playerId: player.id });
        this.broadcastState();
    }

    updateInput(socket, input = {}) {
        const client = this.clients.get(socket);
        if (!client || !client.playerId || this.status !== "playing") return;

        this.inputs[client.playerId] = {
            up: Boolean(input.up),
            down: Boolean(input.down),
            left: Boolean(input.left),
            right: Boolean(input.right),
            dropBomb: Boolean(input.dropBomb),
        };
    }

    addChat(socket, text) {
        const client = this.clients.get(socket);
        const player = client && this.players.find(candidate => candidate.id === client.playerId);
        const cleanText = String(text || "").trim().slice(0, 160);

        if (!player || !cleanText) return;

        const message = {
            id: `m${Date.now()}${Math.random().toString(16).slice(2)}`,
            playerId: player.id,
            nickname: player.nickname,
            text: cleanText,
            sentAt: Date.now(),
        };

        this.chat = [...this.chat.slice(-49), message];
        this.broadcast("chat", { message });
        this.broadcastState();
    }

    removeClient(socket) {
        const client = this.clients.get(socket);
        if (!client) return;

        this.clients.delete(socket);

        if (client.playerId) {
            const player = this.players.find(candidate => candidate.id === client.playerId);
            if (player) {
                player.connected = false;
            }
            delete this.inputs[client.playerId];
        }

        if (this.status === "lobby" || this.status === "countdown") {
            this.players = this.players.filter(player => player.connected);
            this.cancelCountdownIfNeeded();
        }

        this.broadcastState();
    }

    scheduleLobbyTimers() {
        if (this.players.length >= MAX_PLAYERS) {
            this.startCountdown();
            return;
        }

        if (this.players.length >= MIN_PLAYERS && !this.lobbyTimer && !this.countdownTimer) {
            this.lobbyTimer = setTimeout(() => {
                this.lobbyTimer = null;
                if (this.players.length >= MIN_PLAYERS) {
                    this.startCountdown();
                }
            }, this.lobbyWaitMs);
        }
    }

    startCountdown() {
        if (this.status === "playing" || this.status === "finished") return;

        clearTimeout(this.lobbyTimer);
        clearTimeout(this.countdownTimer);
        this.lobbyTimer = null;
        this.status = "countdown";
        this.countdownEndsAt = Date.now() + this.readyCountdownMs;
        this.countdownTimer = setTimeout(() => this.startGame(), this.readyCountdownMs);
        this.broadcastState();
    }

    cancelCountdownIfNeeded() {
        if (this.players.length >= MIN_PLAYERS) return;

        clearTimeout(this.lobbyTimer);
        clearTimeout(this.countdownTimer);
        this.lobbyTimer = null;
        this.countdownTimer = null;
        this.countdownEndsAt = null;
        this.status = "lobby";
    }

    startGame() {
        if (this.players.length < MIN_PLAYERS) {
            this.cancelCountdownIfNeeded();
            this.broadcastState();
            return;
        }

        clearTimeout(this.lobbyTimer);
        clearTimeout(this.countdownTimer);
        this.lobbyTimer = null;
        this.countdownTimer = null;
        this.status = "playing";
        this.countdownEndsAt = null;
        this.game = createGame(this.players, this.seed);
        this.lastTickAt = Date.now();
        this.startLoops();
        this.broadcastState();
    }

    startLoops() {
        clearInterval(this.tickTimer);
        clearInterval(this.snapshotTimer);
        this.tickTimer = setInterval(() => this.tick(), this.tickMs);
        this.snapshotTimer = setInterval(() => this.broadcastState(), this.snapshotMs);
    }

    tick(now = Date.now()) {
        if (this.status !== "playing" || !this.game) return;

        const deltaMs = Math.min(100, Math.max(16, now - this.lastTickAt));
        this.game = tickGame(this.game, this.inputs, now, deltaMs);
        this.lastTickAt = now;

        for (const playerId of Object.keys(this.inputs)) {
            this.inputs[playerId].dropBomb = false;
        }

        if (this.game.status === "finished") {
            this.status = "finished";
            clearInterval(this.tickTimer);
            clearInterval(this.snapshotTimer);
            this.broadcastState();
        }
    }

    restartIfFinished() {
        if (this.status !== "finished") return;

        this.status = "lobby";
        this.game = null;
        this.players = this.players.filter(player => player.connected);
        this.inputs = Object.fromEntries(this.players.map(player => [player.id, {}]));
        this.scheduleLobbyTimers();
        this.broadcastState();
    }

    createSnapshot() {
        return {
            status: this.status,
            players: this.players,
            playerCount: this.players.length,
            maxPlayers: MAX_PLAYERS,
            minPlayers: MIN_PLAYERS,
            countdownEndsAt: this.countdownEndsAt,
            game: serializeGame(this.game),
            chat: this.chat,
        };
    }

    broadcastState() {
        this.broadcast("server_state", this.createSnapshot());
    }

    broadcast(type, payload = {}) {
        for (const { socket } of this.clients.values()) {
            this.send(socket, type, payload);
        }
    }

    send(socket, type, payload = {}) {
        if (socket.readyState !== 1) return;

        socket.send(JSON.stringify({ type, ...payload }));
    }

    close() {
        clearTimeout(this.lobbyTimer);
        clearTimeout(this.countdownTimer);
        clearInterval(this.tickTimer);
        clearInterval(this.snapshotTimer);
        if (this.wss) {
            this.wss.close();
        }
    }
}

function sanitizeNickname(nickname) {
    return String(nickname || "").trim().replace(/\s+/g, " ").slice(0, 20);
}

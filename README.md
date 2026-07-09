# Bomberman DOM

A real-time, multiplayer Bomberman built with a **custom, dependency-free front-end framework** and rendered entirely in the DOM. Two to four players join a lobby, then battle on a destructible grid, placing bombs, collecting power-ups, and being the last one standing.

The game is **server-authoritative**: a Node.js WebSocket server owns the single source of truth and simulates the match at ~60 Hz; browsers are thin clients that send input and render snapshots.

---

## Highlights

**Gameplay**
- 2–4 player online matches with a lobby, waiting-room countdown, and a Start now option.
- Destructible blocks, chain-free bomb blasts, lives, and last-player-standing win detection.
- Five power-ups: extra bomb, bigger flame, more speed, 1 Up, and Bomb Pass.
- A random power-up is released wherever a player dies.
- In-game and lobby chat, keyboard-driven (Enter to chat, Esc back to the board).
- Reconnect after a refresh straight back into your seat; disconnected players are shielded (shown as "out") for a 30s grace window, then eliminated so the round always resolves.

**Engineering**
- A hand-written mini-framework (`framework/`): virtual DOM, keyed-free diff/patch, delegated events, and a Redux-style store.
- Performance-minded rendering: a static board layer painted once, a dynamic entities layer patched per snapshot, `transform`-based movement, and a memoized grid that the patcher skips when unchanged.
- Deterministic, wall-clock-independent timing (fuses/explosions advance by the simulation delta, not `Date.now()`).
- Pure, isolated game logic in `shared/` that runs identically on server and (for reference) client.

---

## Tech stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js (18+; developed on 20) |
| Transport | WebSocket ([`ws`](https://github.com/websockets/ws)) + Node `http` static server |
| Front end | Custom VDOM framework + vanilla ES modules (no build step) |
| Language | Modern JavaScript (ESM) |

No bundler, no front-end dependencies — the browser loads the ES modules directly.

---

## Getting started

**Requirements:** Node.js 18+ and npm.

```bash
# 1. Install the one dependency (ws)
npm install

# 2. Start the server (serves the client and hosts the game)
npm start

# 3. Open the game
#    http://localhost:8000
```

A match needs at least **2 players**, so open the URL in **two or more browser tabs** (or share your LAN address). Enter a nickname in each and join.

- With **2–3** players, the match starts after a short waiting window, then a ready countdown or hit **Start now**.
- With **4** players it starts immediately after the ready countdown.

Set a custom port with `PORT=3000 npm start`.

> **Note:** load the page from the **Node server** (`localhost:8000`), not a static "Live Preview" the WebSocket connection requires this server.

---

## Controls

| Action | Keys |
|--------|------|
| Move | `W` `A` `S` `D` or Arrow keys |
| Place bomb | `Space` |
| Open chat | `Enter` |
| Send message | `Enter` (while chat is focused) |
| Back to the board | `Esc` (while chat is focused) |

---

## Power-ups

Dropped by destroyed blocks (~15% chance) and **always** released where a player dies.

| Icon | Power-up | Effect |
|------|----------|--------|
| 💣 | Bomb | +1 concurrent bomb |
| 🔥 | Flame | +1 blast range |
| ⚡ | Speed | +1 movement speed (capped) |
| ❤️ | 1 Up | +1 life |
| 🟣 | Bomb Pass | Walk through bombs (permanent for the match) |

Power-ups persist across your own deaths and last until you are eliminated.

## Authors

- Christos Gkaldanidis
- Christos Markos

Creators and primary Developers
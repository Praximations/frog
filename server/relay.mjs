import { randomBytes, randomInt } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { WebSocketServer, WebSocket } from 'ws';
import { cleanName, uniqueName, validAnswer, validLook, cleanMove, NAME_LENGTH, PLAYERS_PER_ROOM, REACTIONS, WORLD_BYTES } from './shared.mjs';

export { cleanName, REACTIONS };

/**
 * Class relay. One host browser (the projector) owns all game state and scoring; phones join with
 * a code, a nickname and a frog look. Each phone shows the map and moves its own frog, sending its
 * position; the projector sends everyone snapshots of the world. The relay validates, rate-limits
 * and forwards.
 */
export const LIMITS = { rooms: 30, playersPerRoom: PLAYERS_PER_ROOM, clients: 600, nameLength: NAME_LENGTH, stateBytes: 3000, privateBytes: 1000, worldBytes: WORLD_BYTES };
/** Messages per second: the projector sends world snapshots plus a message per player at times. */
const RATE = { host: 600, player: 40 };
export const MODES = ['lobby', 'intro', 'round', 'quiz', 'reveal', 'results', 'learn', 'final', 'paused'];

const send = (socket, value) => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value)); };
const jsonSize = value => { try { return JSON.stringify(value).length; } catch { return Infinity; } };
const isPlainObject = value => !!value && typeof value === 'object' && !Array.isArray(value);

/** Addresses classmates can type on the same network. */
export function lanAddresses(port) {
  const found = [];
  for (const items of Object.values(networkInterfaces())) {
    for (const item of items || []) if (item.family === 'IPv4' && !item.internal) found.push(`http://${item.address}:${port}`);
  }
  return found;
}

/** Adds the class relay to an existing HTTP server (standalone host, Vite dev or Vite preview). */
export function attachRelay(http, { path = '/session' } = {}) {
  const rooms = new Map();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 32768, perMessageDeflate: false });

  const onUpgrade = (req, socket, head) => {
    let pathname = '';
    try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { /* ignored */ }
    if (pathname !== path) return; // Other upgrade handlers (such as Vite HMR) keep their connections.
    let validOrigin = false;
    try { validOrigin = !req.headers.origin || new URL(req.headers.origin).host === req.headers.host; } catch { /* invalid origin */ }
    if (!validOrigin || wss.clients.size >= LIMITS.clients) { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  };
  http.on('upgrade', onUpgrade);

  wss.on('connection', socket => {
    socket.alive = true;
    let windowStart = Date.now(), messages = 0, joins = 0, lastReact = 0, lastPing = 0, lastAnswer = 0;
    socket.on('error', () => {});
    socket.on('pong', () => { socket.alive = true; });
    socket.on('message', data => {
      if (Date.now() - windowStart > 1000) { windowStart = Date.now(); messages = 0; }
      if (++messages > (socket.role === 'host' ? RATE.host : RATE.player)) { socket.close(1008, 'Too many messages'); return; }
      if (socket.role !== 'host' && data.length > 4096) return;
      let message;
      try { message = JSON.parse(data.toString()); } catch { send(socket, { type: 'error', message: 'Invalid message.' }); return; }
      if (!isPlainObject(message)) return;
      const room = rooms.get(socket.code);

      if (message.type === 'host' && !socket.role) {
        if (rooms.size >= LIMITS.rooms) { send(socket, { type: 'error', message: 'The server is full. Try again shortly.' }); return; }
        let code;
        do { code = String(randomInt(100000, 1000000)); } while (rooms.has(code));
        rooms.set(code, { code, host: socket, players: new Map(), state: { mode: 'lobby' } });
        socket.role = 'host'; socket.code = code;
        send(socket, { type: 'hosted', code });
        return;
      }

      if (message.type === 'join' && !socket.role) {
        if (++joins > 10) { socket.close(1008, 'Too many join attempts'); return; }
        const code = String(message.code ?? '');
        const target = /^\d{6}$/.test(code) ? rooms.get(code) : undefined;
        if (!target) { send(socket, { type: 'error', message: 'That code is not active. Check the big screen.' }); return; }
        let player = typeof message.token === 'string' ? [...target.players.values()].find(item => item.token === message.token) : undefined;
        if (player) {
          if (player.socket && player.socket !== socket) { send(player.socket, { type: 'ended', reason: 'replaced' }); player.socket.code = undefined; player.socket.close(); }
        } else {
          const name = cleanName(message.name);
          if (!name) { send(socket, { type: 'error', message: 'Type a nickname first.' }); return; }
          if (target.players.size >= LIMITS.playersPerRoom) { send(socket, { type: 'error', message: 'This game is full.' }); return; }
          const look = validLook(message.look) ? message.look : '0.0.0';
          player = { id: randomBytes(4).toString('hex'), token: randomBytes(12).toString('hex'), name: uniqueName([...target.players.values()].map(item => item.name), name), look, socket: null };
          target.players.set(player.id, player);
        }
        player.socket = socket;
        socket.role = 'player'; socket.code = code; socket.playerId = player.id;
        send(socket, { type: 'joined', code, id: player.id, name: player.name, token: player.token, state: target.state });
        send(target.host, { type: 'player', event: 'join', id: player.id, name: player.name, look: player.look });
        return;
      }

      if (!room) return;

      if (socket.role === 'host') {
        if (message.type === 'world') {
          // A snapshot of the map for every phone: sent often, so it isn't kept.
          if (!isPlainObject(message.w)) return;
          const text = JSON.stringify({ type: 'world', w: message.w });
          if (text.length > LIMITS.worldBytes + 30) return;
          for (const player of room.players.values()) if (player.socket?.readyState === WebSocket.OPEN && player.socket.bufferedAmount < 256 * 1024) player.socket.send(text);
        } else if (message.type === 'state') {
          const state = message.state;
          if (!isPlainObject(state) || !MODES.includes(state.mode) || jsonSize(state) > LIMITS.stateBytes) return;
          room.state = state;
          for (const player of room.players.values()) send(player.socket, { type: 'state', state });
        } else if (message.type === 'to') {
          const player = room.players.get(String(message.id));
          if (player && isPlainObject(message.data) && jsonSize(message.data) <= LIMITS.privateBytes) send(player.socket, { type: 'private', data: message.data });
        } else if (message.type === 'kick') {
          const player = room.players.get(String(message.id));
          if (!player) return;
          room.players.delete(player.id);
          if (player.socket) { send(player.socket, { type: 'kicked' }); player.socket.code = undefined; player.socket.close(); }
          send(room.host, { type: 'player', event: 'removed', id: player.id });
        }
        return;
      }

      if (socket.role !== 'player') return;
      const id = socket.playerId;
      if (room.players.get(id)?.socket !== socket) return;
      if (message.type === 'move') {
        // Where this player's own frog is now.
        const move = cleanMove(message);
        if (move) send(room.host, { type: 'move', id, ...move });
      } else if (message.type === 'react') {
        if (!REACTIONS.includes(message.emoji) || Date.now() - lastReact < 250) return;
        lastReact = Date.now();
        send(room.host, { type: 'react', id, emoji: message.emoji });
      } else if (message.type === 'answer') {
        // A quiz answer: the host keeps only the first one per question.
        if (!validAnswer(message) || Date.now() - lastAnswer < 200) return;
        lastAnswer = Date.now();
        send(room.host, { type: 'answer', id, q: message.q, choice: message.choice });
      } else if (message.type === 'ping') {
        // "Find me": the host makes this player's frog jump and flash.
        if (Date.now() - lastPing < 1000) return;
        lastPing = Date.now();
        send(room.host, { type: 'ping', id });
      }
    });

    socket.on('close', () => {
      const room = rooms.get(socket.code);
      if (!room) return;
      if (socket.role === 'host' && room.host === socket) {
        rooms.delete(socket.code);
        for (const player of room.players.values()) { send(player.socket, { type: 'ended' }); player.socket?.close(); }
      } else if (socket.role === 'player') {
        const player = room.players.get(socket.playerId);
        if (player?.socket !== socket) return;
        player.socket = null; // Kept so the phone can rejoin with its token and keep its frog and score.
        send(room.host, { type: 'player', event: 'leave', id: player.id });
      }
    });
  });

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!socket.alive) { socket.terminate(); continue; }
      socket.alive = false; socket.ping();
    }
  }, 15000);
  heartbeat.unref?.();

  return {
    rooms,
    close: async () => {
      clearInterval(heartbeat);
      http.off('upgrade', onUpgrade);
      for (const socket of wss.clients) socket.terminate();
      await new Promise(resolve => wss.close(resolve));
    },
  };
}

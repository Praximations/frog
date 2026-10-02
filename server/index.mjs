import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomInt } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { WebSocketServer, WebSocket } from 'ws';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const send = (socket, value) => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value)); };

/** Optional LAN pairing relay. The browser on the main device owns all game state. */
export function createHostServer(root = dist) {
  const rooms = new Map();
  const http = createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(resolve(root) + sep)) { res.writeHead(403); res.end(); return; }
      if (!(await stat(file)).isFile()) { res.writeHead(404); res.end(); return; }
      const data = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404); res.end('File not found. Run npm run build before hosting.'); }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024, perMessageDeflate: false });
  http.on('upgrade', (req, socket, head) => {
    let validOrigin = false;
    try { validOrigin = !req.headers.origin || new URL(req.headers.origin).host === req.headers.host; } catch { /* invalid origin */ }
    if (req.url !== '/session' || !validOrigin || wss.clients.size >= 100) { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  });

  wss.on('connection', socket => {
    socket.alive = true;
    let windowStart = Date.now(), messages = 0, joins = 0;
    socket.on('error', () => {});
    socket.on('pong', () => { socket.alive = true; });
    socket.on('message', data => {
      if (Date.now() - windowStart > 1000) { windowStart = Date.now(); messages = 0; }
      if (++messages > 80) { socket.close(1008, 'Too many messages'); return; }
      let message;
      try { message = JSON.parse(data.toString()); } catch { send(socket, { type: 'error', message: 'Invalid message.' }); return; }
      if (!message || typeof message !== 'object') return;
      const room = rooms.get(socket.code);
      if (message.type === 'host' && !socket.role) {
        if (rooms.size >= 30) { send(socket, { type: 'error', message: 'The server is full. Try again shortly.' }); return; }
        let code;
        do { code = String(randomInt(100000, 1000000)); } while (rooms.has(code));
        rooms.set(code, { host: socket, controller: null, state: { mode: 'lobby', objective: 'Waiting for the main screen to start.' } });
        socket.role = 'host'; socket.code = code;
        send(socket, { type: 'hosted', code });
      } else if (message.type === 'join' && !socket.role) {
        if (++joins > 10) { socket.close(1008, 'Too many join attempts'); return; }
        const target = rooms.get(String(message.code));
        if (!/^\d{6}$/.test(String(message.code)) || !target) { send(socket, { type: 'error', message: 'That code is not active. Check the main screen.' }); return; }
        if (target.controller) { send(socket, { type: 'error', message: 'This forest already has a controller.' }); return; }
        socket.role = 'controller'; socket.code = String(message.code); target.controller = socket;
        send(socket, { type: 'joined', code: socket.code, state: target.state });
        send(target.host, { type: 'controller', connected: true });
      } else if (message.type === 'input' && socket.role === 'controller' && room) {
        const input = message.input;
        if (!input || !Number.isFinite(input.x) || !Number.isFinite(input.y) || Math.abs(input.x) > 1 || Math.abs(input.y) > 1) return;
        send(room.host, { type: 'input', input: { x: input.x, y: input.y, hop: input.hop === true, interact: input.interact === true, pause: input.pause === true } });
      } else if (message.type === 'state' && socket.role === 'host' && room) {
        if (!['lobby', 'playing', 'paused', 'card'].includes(message.state?.mode) || typeof message.state?.objective !== 'string') return;
        room.state = { mode: message.state.mode, objective: message.state.objective.slice(0, 160) };
        send(room.controller, { type: 'state', state: room.state });
      }
    });
    socket.on('close', () => {
      const room = rooms.get(socket.code);
      if (!room) return;
      if (socket.role === 'host') {
        rooms.delete(socket.code); send(room.controller, { type: 'ended' }); room.controller?.close();
      } else if (room.controller === socket) {
        room.controller = null; send(room.host, { type: 'controller', connected: false });
        send(room.host, { type: 'input', input: { x: 0, y: 0, hop: false, interact: false, pause: false } });
      }
    });
  });
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!socket.alive) { socket.terminate(); continue; }
      socket.alive = false; socket.ping();
    }
  }, 15000);
  heartbeat.unref();
  return {
    http, rooms,
    close: async () => {
      clearInterval(heartbeat);
      for (const socket of wss.clients) socket.terminate();
      await new Promise(resolve => wss.close(resolve));
      await new Promise(resolve => http.close(resolve));
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { http } = createHostServer();
  const port = Number(process.env.PORT || 3000);
  http.listen(port, '0.0.0.0', () => {
    console.log(`\nMountain Chicken main-device server\n  This computer: http://localhost:${port}`);
    for (const items of Object.values(networkInterfaces())) {
      for (const item of items || []) if (item.family === 'IPv4' && !item.internal) console.log(`  Same-network devices: http://${item.address}:${port}`);
    }
    console.log('\nKeep this terminal open. Choose MAIN DEVICE to create a code.\n');
  });
  http.on('error', error => { console.error(`Cannot start server: ${error.message}`); process.exitCode = 1; });
}

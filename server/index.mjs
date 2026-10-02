import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { attachRelay, lanAddresses } from './relay.mjs';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8' };

/** Static host for the built game plus the class relay (phones join with a code). */
export function createHostServer(root = dist) {
  const http = createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname === '/api/info') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ addresses: lanAddresses(req.socket.localPort) }));
        return;
      }
      const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(resolve(root) + sep)) { res.writeHead(403); res.end(); return; }
      if (!(await stat(file)).isFile()) { res.writeHead(404); res.end(); return; }
      const data = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404); res.end('File not found. Run npm run build before hosting.'); }
  });
  const relay = attachRelay(http);
  // Standalone server: refuse every other upgrade request.
  http.on('upgrade', (req, socket) => {
    let pathname = '';
    try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { /* ignored */ }
    if (pathname !== '/session') socket.destroy();
  });
  return {
    http, rooms: relay.rooms,
    close: async () => {
      await relay.close();
      await new Promise(resolve => http.close(resolve));
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { http } = createHostServer();
  const port = Number(process.env.PORT || 3000);
  http.listen(port, '0.0.0.0', () => {
    console.log(`\nMountain Chicken class server\n  Projector (this computer): http://localhost:${port}`);
    for (const address of lanAddresses(port)) console.log(`  Classmates on the same Wi-Fi: ${address}`);
    console.log('\nKeep this terminal open. Click HOST A GAME on the projector to get a game code.\n');
  });
  http.on('error', error => { console.error(`Cannot start server: ${error.message}`); process.exitCode = 1; });
}

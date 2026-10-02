import { defineConfig, type Plugin, type Connect } from 'vite';
import { attachRelay, lanAddresses } from './server/relay.mjs';

type Bindable = { address(): unknown; on(event: string, listener: (...args: unknown[]) => void): unknown };

/** Lets phones join from `npm run dev:class` and `npm run preview` too, not only `npm run host`. */
function classRelay(): Plugin {
  const setup = (httpServer: Bindable | null, middlewares: Connect.Server) => {
    if (!httpServer) return;
    attachRelay(httpServer);
    middlewares.use('/api/info', (req, res) => {
      const bound = httpServer.address() as { address?: string; port?: number } | null;
      const open = bound?.address === '0.0.0.0' || bound?.address === '::';
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ addresses: open && bound?.port ? lanAddresses(bound.port) : [] }));
    });
  };
  return {
    name: 'class-relay',
    configureServer(server) { setup(server.httpServer as Bindable | null, server.middlewares); },
    configurePreviewServer(server) { setup(server.httpServer as unknown as Bindable, server.middlewares); },
  };
}

export default defineConfig({
  base: './',
  plugins: [classRelay()],
  build: { target: 'es2020', outDir: 'dist', chunkSizeWarningLimit: 1600 },
});

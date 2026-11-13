import { defineConfig, type Plugin } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

// Dev-only: lets the iPad save results and samples straight into the repo,
// because a Windows dev machine can't receive AirDrop or read the iPad clipboard.
//   POST /__results?spike=ink   -> <spike>/results/<timestamp>.json
//   POST /__sample              -> samples/<timestamp>.json
function saveToRepo(): Plugin {
  return {
    name: 'save-to-repo',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://x');
        if (req.method !== 'POST' || !['/__results', '/__sample'].includes(url.pathname)) return next();
        const spike = (url.searchParams.get('spike') ?? 'misc').replace(/[^a-z0-9-]/gi, '');
        const dir = url.pathname === '/__sample' ? `${root}samples` : `${root}${spike}/results`;
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            JSON.parse(body);
            mkdirSync(dir, { recursive: true });
            const file = `${dir}/${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            writeFileSync(file, body);
            res.end(JSON.stringify({ saved: file.slice(root.length) }));
          } catch (e) {
            res.statusCode = 400;
            res.end(String(e));
          }
        });
      });
    },
  };
}

// HTTPS is needed for the iPad over LAN (service workers, secure context).
// `vite --mode http` serves plain HTTP for local smoke tests (localhost is secure anyway).
export default defineConfig(({ mode }) => ({
  plugins: [mode === 'http' ? [] : basicSsl(), saveToRepo()],
  server: { host: true },
  preview: { host: true },
  build: {
    rollupOptions: {
      input: {
        main: `${root}index.html`,
        ink: `${root}ink/index.html`,
        store: `${root}store/index.html`,
      },
    },
  },
}));

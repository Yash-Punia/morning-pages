import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

// `vite preview` serves the same global headers as Vercel (CSP included), so e2e tests
// catch CSP violations before a deploy does.
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const productionHeaders = Object.fromEntries(
  vercel.headers.find((h) => h.source === '/(.*)')!.headers.map((h) => [h.key, h.value]),
);
// Plain-HTTP preview only: upgrade-insecure-requests would rewrite every asset to https://localhost.
// Everything else in the CSP stays, so violations still surface in e2e.
const httpPreviewHeaders = {
  ...productionHeaders,
  'Content-Security-Policy': productionHeaders['Content-Security-Policy']!.replace(/;\s*upgrade-insecure-requests/, ''),
};

// HTTPS is needed for the iPad over LAN (service workers need a secure context).
// `--mode http` serves plain HTTP for local and headless runs (localhost is secure anyway).
export default defineConfig(({ mode }) => ({
  plugins: [
    svelte(),
    mode === 'http' ? [] : basicSsl(),
    // TDD 10.1 and 10.4. `id` and `start_url` are fixed forever: changing them makes a different app.
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt',
      injectRegister: false,
      // index.html already has light/dark theme-color metas; don't add a third.
      pwaAssets: { config: true, overrideManifestIcons: true, injectThemeColor: false },
      manifest: {
        id: '/',
        name: 'Morning Pages',
        short_name: 'Morning Pages', // not truncated on iPad Pro 12.9" (S3, D-031)
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F7F3EA',
        theme_color: '#F7F3EA',
        categories: ['lifestyle', 'productivity'],
      },
      workbox: {
        // No webmanifest here: the plugin precaches it itself, and a second entry with another
        // revision makes Workbox throw at startup, so nothing gets cached.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        inlineWorkboxRuntime: true,
      },
    }),
  ],
  server: { host: true },
  preview: { host: true, headers: mode === 'http' ? httpPreviewHeaders : productionHeaders },
  build: { manifest: true }, // read by scripts/check-dist.mjs for the launch budget
  test: {
    environment: 'node',
    setupFiles: ['fake-indexeddb/auto'],
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
  },
}));

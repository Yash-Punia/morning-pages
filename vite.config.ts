import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import basicSsl from '@vitejs/plugin-basic-ssl';

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
  plugins: [svelte(), mode === 'http' ? [] : basicSsl()],
  server: { host: true },
  preview: { host: true, headers: mode === 'http' ? httpPreviewHeaders : productionHeaders },
  build: { manifest: true }, // read by scripts/check-dist.mjs for the launch budget
  test: {
    environment: 'node',
    setupFiles: ['fake-indexeddb/auto'],
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
  },
}));

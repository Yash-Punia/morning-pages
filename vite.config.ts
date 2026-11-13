import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import basicSsl from '@vitejs/plugin-basic-ssl';

// HTTPS is needed for the iPad over LAN (service workers need a secure context).
// `--mode http` serves plain HTTP for local and headless runs (localhost is secure anyway).
export default defineConfig(({ mode }) => ({
  plugins: [svelte(), mode === 'http' ? [] : basicSsl()],
  server: { host: true },
  preview: { host: true },
  build: { manifest: true }, // read by scripts/check-dist.mjs for the launch budget
}));

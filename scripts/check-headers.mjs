// Header guard (TDD 13.1 `headers` job). The CSP is a security promise (PRI-2), so any change
// to it must change this file too, in the same reviewed diff.
import { readFileSync } from 'node:fs';

const EXPECTED_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self' https://gateway.umami.is", // the only third-party origin (D-028)
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

/** @type {{ rewrites: { source: string }[], headers: { source: string, headers: { key: string, value: string }[] }[] }} */
const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
const header = (/** @type {string} */ source, /** @type {string} */ key) =>
  config.headers.find((h) => h.source === source)?.headers.find((h) => h.key === key)?.value;

const failures = [];
if (header('/(.*)', 'Content-Security-Policy') !== EXPECTED_CSP) failures.push('CSP differs from the TDD 11.2 policy');
for (const key of ['X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'Cross-Origin-Opener-Policy', 'Strict-Transport-Security'])
  if (!header('/(.*)', key)) failures.push(`missing ${key}`);
if (header('/sw.js', 'Cache-Control') !== 'no-cache') failures.push('sw.js must be no-cache');
if (header('/manifest.webmanifest', 'Cache-Control') !== 'no-cache') failures.push('manifest must be no-cache');
if (!config.rewrites.some((r) => r.source.includes('(?!assets/)'))) failures.push('SPA rewrite must exclude /assets/');

for (const f of failures) console.error(`✗ vercel.json: ${f}`);
if (failures.length) process.exit(1);
console.log('✓ vercel.json headers match TDD 11.2');

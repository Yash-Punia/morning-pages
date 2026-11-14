// Build guard (TDD 13.1, D-027). Run after `vite build`:
//  1. Launch budget: entry chunk + its static imports + their CSS (gzipped) + preloaded fonts ≤ 400 KB.
//  2. No inline <script>, <style> or style="" in dist/index.html (script-src/style-src 'self').
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const BUDGET = 400 * 1024;

/** @typedef {{ file: string, isEntry?: boolean, imports?: string[], css?: string[] }} Chunk */

/**
 * Files on the launch path, from Vite's manifest plus fonts preloaded by index.html.
 * @param {Record<string, Chunk>} manifest
 * @param {string} html
 */
export function launchFiles(manifest, html) {
  const entry = Object.values(manifest).find((c) => c.isEntry);
  if (!entry) throw new Error('no entry chunk in manifest');
  const files = new Set(['index.html']);
  const walk = (/** @type {Chunk} */ chunk) => {
    if (files.has(chunk.file)) return;
    files.add(chunk.file);
    for (const css of chunk.css ?? []) files.add(css);
    for (const key of chunk.imports ?? []) walk(manifest[key]);
  };
  walk(entry);
  for (const [, href] of html.matchAll(/<link[^>]*rel="preload"[^>]*as="font"[^>]*href="\/?([^"]+)"/g)) files.add(href);
  return [...files];
}

/** Gzipped size, except fonts, which are already compressed. */
export const transferSize = (/** @type {string} */ name, /** @type {Buffer} */ buf) => (/\.woff2?$/.test(name) ? buf.length : gzipSync(buf, { level: 9 }).length);

export function inlineProblems(/** @type {string} */ html) {
  const problems = [];
  if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) problems.push('inline <script>');
  if (/<style[\s>]/i.test(html)) problems.push('inline <style>');
  if (/\sstyle\s*=/i.test(html)) problems.push('style="" attribute');
  return problems;
}

function main(dist = 'dist') {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const manifest = JSON.parse(readFileSync(join(dist, '.vite/manifest.json'), 'utf8'));
  let total = 0;
  for (const f of launchFiles(manifest, html)) {
    const size = transferSize(f, readFileSync(join(dist, f)));
    total += size;
    console.log(`${(size / 1024).toFixed(1).padStart(8)} KB  ${f}`);
  }
  console.log(`${(total / 1024).toFixed(1).padStart(8)} KB  launch total (budget ${BUDGET / 1024} KB)`);
  const problems = inlineProblems(html);
  for (const p of problems) console.error(`✗ dist/index.html has an ${p}`);
  if (total > BUDGET) console.error('✗ launch budget exceeded');
  if (problems.length || total > BUDGET) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv[2]);

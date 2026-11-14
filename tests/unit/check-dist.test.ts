import { expect, test } from 'vitest';
import { inlineProblems, launchFiles, transferSize, BUDGET } from '../../scripts/check-dist.mjs';

const manifest = {
  'index.html': { file: 'assets/index.js', isEntry: true, imports: ['_shared.js'], css: ['assets/index.css'] },
  '_shared.js': { file: 'assets/shared.js', imports: ['index.html'] }, // cycle back to entry
  'src/screens/Settings.svelte': { file: 'assets/settings.js', isDynamicEntry: true },
};

test('launch path follows static imports and preloaded fonts, not lazy chunks', () => {
  const html = '<link rel="preload" as="font" type="font/woff2" href="/assets/fraunces-latin.woff2" crossorigin>';
  expect(launchFiles(manifest, html).sort()).toEqual(
    ['assets/fraunces-latin.woff2', 'assets/index.css', 'assets/index.js', 'assets/shared.js', 'index.html'].sort(),
  );
});

test('fonts count raw, everything else gzipped', () => {
  const big = Buffer.alloc(500 * 1024, 'a');
  expect(transferSize('x.woff2', big)).toBe(big.length);
  expect(transferSize('x.js', big)).toBeLessThan(BUDGET);
});

test('flags inline script, style tag and style attribute, but not module scripts', () => {
  expect(inlineProblems('<script type="module" crossorigin src="/assets/i.js"></script>')).toEqual([]);
  expect(inlineProblems('<script>boot()</script>')).toEqual(['inline <script>']);
  expect(inlineProblems('<style>a{}</style><div style="x"></div>')).toEqual(['inline <style>', 'style="" attribute']);
});

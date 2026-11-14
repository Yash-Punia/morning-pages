import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

// WCAG contrast for every theme, read from the real token file (TDD 12.4, PRD 10.4).
// Colour tokens are written `--name: light-dark(<paper>, <night>)` in OKLCH.
const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');
const OKLCH = String.raw`oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\)`;
const tokens: Record<string, { paper: number[]; night: number[] }> = {};
for (const m of css.matchAll(new RegExp(String.raw`--([\w-]+):\s*light-dark\(\s*${OKLCH}\s*,\s*${OKLCH}\s*\)`, 'g')))
  tokens[m[1]!] = { paper: [+m[2]!, +m[3]!, +m[4]!], night: [+m[5]!, +m[6]!, +m[7]!] };

/** OKLCH → linear sRGB → relative luminance (clamped to gamut). */
function luminance([L, C, H]: number[]) {
  const a = C! * Math.cos((H! * Math.PI) / 180), b = C! * Math.sin((H! * Math.PI) / 180), l0 = L! / 100;
  const l = (l0 + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (l0 - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (l0 - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.min(1, Math.max(0, c)));
  return 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
}
const contrast = (x: number[], y: number[]) => {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi! + 0.05) / (lo! + 0.05);
};

// [foreground, background, minimum]. 4.5 for text, 3 for non-text UI marks (WCAG 1.4.11).
const PAIRS: [string, string, number][] = [
  ['ink', 'paper', 4.5], ['ink', 'linen', 4.5], ['ink', 'linen-deep', 4.5],
  ['ink-soft', 'paper', 4.5], ['ink-soft', 'linen', 4.5],
  ['accent-ink', 'paper', 4.5], ['accent-ink', 'linen', 4.5],
  ['accent', 'paper', 3], ['accent', 'linen', 3], ['sage', 'paper', 3],
  // Pen inks are read like text on the page
  ['pen-black', 'paper', 4.5], ['pen-blueBlack', 'paper', 4.5], ['pen-sepia', 'paper', 4.5],
  ['pen-forest', 'paper', 4.5], ['pen-crimson', 'paper', 4.5],
];

test('the anchor colours from the PRD are present', () => {
  expect(Object.keys(tokens)).toEqual(expect.arrayContaining(['paper', 'ink', 'accent', 'sage', 'linen']));
});

describe.each(['paper', 'night'] as const)('%s theme', (theme) => {
  test.each(PAIRS)('%s on %s ≥ %s:1', (fg, bg, min) => {
    expect(tokens[fg], `missing --${fg}`).toBeDefined();
    expect(tokens[bg], `missing --${bg}`).toBeDefined();
    expect(contrast(tokens[fg]![theme], tokens[bg]![theme])).toBeGreaterThanOrEqual(min);
  });
});

test('PRD hex anchors convert as expected (sanity check of the maths)', () => {
  // #1E2A3A on #F7F3EA is ~13.5:1 by the WCAG formula on the hex values.
  expect(contrast([28.2, 0.034, 255.8], [96.5, 0.013, 86.8])).toBeCloseTo(13.5, 0);
});

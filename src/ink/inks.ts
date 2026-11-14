// Ink colours per theme (TDD 5.5). Built-in inks are palette ids resolved from tokens; custom
// inks are hex, and by night their OKLCH lightness is flipped so they stay readable.
import { canvasColor, resolveToken } from './colors.ts';
import type { InkId } from './types.ts';

export const PALETTE = ['black', 'blueBlack', 'sepia', 'forest', 'crimson'] as const;
export const INK_NAMES: Record<(typeof PALETTE)[number], string> = {
  black: 'Black', blueBlack: 'Blue-black', sepia: 'Sepia', forest: 'Forest', crimson: 'Crimson',
};

const isNight = () => {
  const m = /rgb\((\d+) (\d+) (\d+)/.exec(resolveToken('--paper'));
  return !!m && (0.2126 * +m[1]! + 0.7152 * +m[2]! + 0.0722 * +m[3]!) / 255 < 0.5;
};

export function inkColor(id: InkId): string {
  if (!id.startsWith('#')) return resolveToken(`--pen-${id}`);
  return canvasColor(isNight() ? flipLightness(id) : id);
}

/** A custom ink for dark paper: same hue and chroma, lightness mirrored (L → 1 − L). */
export function flipLightness(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return `oklch(${((1 - L) * 100).toFixed(1)}% ${C.toFixed(3)} ${H.toFixed(1)})`;
}

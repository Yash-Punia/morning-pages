// Stroke quality metrics from the S1 spike (spikes/ink/pipeline.check.ts), shared by the unit
// test and `npm run ink:check`.
import type { Pt } from '../src/ink/types.ts';

const d2 = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** RMS of the second difference: how much the path wiggles point to point. */
export function jitter(p: Pt[]) {
  let s = 0;
  for (let i = 2; i < p.length; i++) s += (p[i]![0] - 2 * p[i - 1]![0] + p[i - 2]![0]) ** 2 + (p[i]![1] - 2 * p[i - 1]![1] + p[i - 2]![1]) ** 2;
  return Math.sqrt(s / Math.max(1, p.length - 2));
}

/** Mean distance between each raw sample and its smoothed counterpart. */
export const lag = (raw: Pt[], sm: Pt[]) => raw.reduce((a, r, i) => a + d2(r, sm[i]!), 0) / raw.length;

/** Worst gap between a stroke's last raw sample and its smoothed end. */
export const endGapMax = (raws: Pt[][], finals: Pt[][]) =>
  Math.max(...raws.map((r, i) => d2(r[r.length - 1]!, finals[i]![finals[i]!.length - 1]!)));

/** The last ~2 units of the path turn more than 45° from the direction just before it. */
export function hooked(p: Pt[]) {
  const n = p.length - 1;
  let i = n; while (i > 0 && d2(p[n]!, p[i]!) < 2) i--;
  let j = i; while (j > 0 && d2(p[i]!, p[j]!) < 2) j--;
  if (j === i || i === n) return false;
  const a = [p[i]![0] - p[j]![0], p[i]![1] - p[j]![1]] as const, b = [p[n]![0] - p[i]![0], p[n]![1] - p[i]![1]] as const;
  return (a[0] * b[0] + a[1] * b[1]) / Math.hypot(...a) / Math.hypot(...b) < Math.SQRT1_2;
}
export const hookShare = (strokes: Pt[][]) => strokes.filter(hooked).length / strokes.length;

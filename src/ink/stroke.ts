// Stroke building (TDD 5.4, D-036), ported from the S1 spike (spikes/ink/pipeline.ts):
// 1. 1€ filter on position (Casiez, Roussel, Vogel, CHI 2012): smooth when slow, no lag when fast.
// 2. Light low-pass on pressure, so the pre-lift pressure spike doesn't swell the end.
// 3. At pen-up, settle the filter on the last real sample (the lift-off sample is never drawn).
// 4. Fill the perfect-freehand outline with quadratic curves through midpoints.
// Raw samples are what's stored; this runs at render, so live and committed ink match.
import { getStroke, type StrokeOptions } from 'perfect-freehand';
import type { Box, Pt, ToolId } from './types.ts';

export interface Smoothing { minCutoff: number; beta: number }
export const SMOOTHING = {
  low: { minCutoff: 4, beta: 0.04 },
  medium: { minCutoff: 2, beta: 0.025 },
  high: { minCutoff: 1, beta: 0.015 },
} as const satisfies Record<string, Smoothing>;
export type SmoothingLevel = keyof typeof SMOOTHING;

const D_CUTOFF = 8; // Hz, for the speed estimate
const P_ALPHA = 0.2; // per-sample pressure EMA (~20 ms at 240 Hz)
const SETTLE_STEPS = 30; // pen-up: converge onto the last real sample (stops within 0.1 unit)
const alpha = (fc: number, dt: number) => { const r = 2 * Math.PI * fc * dt; return r / (r + 1); };

/** Smooth a stroke. Pure: same input → same output. */
export function smooth(raw: Pt[], cfg: Smoothing, final: boolean): Pt[] {
  if (raw.length === 0) return [];
  const out: Pt[] = [raw[0]!];
  let [x, y, p] = raw[0]!;
  let vx = 0, vy = 0, t = raw[0]![5];
  const step = (r: Pt, rt: number) => {
    const dt = Math.max(0.001, (rt - t) / 1000);
    t = rt;
    const ad = alpha(D_CUTOFF, dt);
    vx += ad * ((r[0] - x) / dt - vx);
    vy += ad * ((r[1] - y) / dt - vy);
    const a = alpha(cfg.minCutoff + cfg.beta * Math.hypot(vx, vy), dt);
    x += a * (r[0] - x);
    y += a * (r[1] - y);
    p += P_ALPHA * (r[2] - p);
    out.push([x, y, p, r[3], r[4], rt]);
  };
  for (let i = 1; i < raw.length; i++) step(raw[i]!, raw[i]![5]);
  if (final && raw.length > 1) {
    const last = raw[raw.length - 1]!;
    for (let k = 1; k <= SETTLE_STEPS && Math.hypot(last[0] - x, last[1] - y) > 0.1; k++) step(last, last[5] + k * 4);
  }
  return out;
}

// Input is pre-filtered, so perfect-freehand's own streamline stays low (S1 round 2).
const TOOLS: Record<ToolId, (size: number) => StrokeOptions> = {
  fountain: (size) => ({ size, thinning: 0.5, smoothing: 0.6, streamline: 0.15, simulatePressure: false, start: { taper: size * 1.2 }, end: { taper: size * 2 } }),
  ballpoint: (size) => ({ size, thinning: 0.1, smoothing: 0.6, streamline: 0.15, simulatePressure: false }),
};

/** The stroke's outline polygon, in the same space as its points. */
export function outline(pts: Pt[], tool: ToolId, size: number, level: SmoothingLevel, complete: boolean): number[][] {
  return getStroke(smooth(pts, SMOOTHING[level], complete), { ...TOOLS[tool](size), last: complete });
}

/** Quadratic curves through edge midpoints: smooth edges instead of polygon facets. */
export function outlinePath(o: number[][]): Path2D {
  const path = new Path2D();
  const n = o.length;
  if (n < 3) return path;
  path.moveTo((o[0]![0]! + o[1]![0]!) / 2, (o[0]![1]! + o[1]![1]!) / 2);
  for (let i = 1; i <= n; i++) {
    const a = o[i % n]!, b = o[(i + 1) % n]!;
    path.quadraticCurveTo(a[0]!, a[1]!, (a[0]! + b[0]!) / 2, (a[1]! + b[1]!) / 2);
  }
  path.closePath();
  return path;
}

/** Bounding box of the points, padded by the stroke width. */
export function pointsBox(pts: Pt[], size: number): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  const pad = size * 1.5;
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

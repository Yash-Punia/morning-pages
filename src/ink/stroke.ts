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
// The fountain pen draws with the italic nib below; this round outline is only its fallback.
const TOOLS: Record<ToolId, (size: number) => StrokeOptions> = {
  fountain: (size) => ({ size, thinning: 0.5, smoothing: 0.6, streamline: 0.15, simulatePressure: false }),
  ballpoint: (size) => ({ size, thinning: 0.1, smoothing: 0.6, streamline: 0.15, simulatePressure: false }),
};

/**
 * The stroke's outline polygon, in the same space as its points (used for hit-testing). For the
 * italic fountain nib it is the sweep's boundary: one nib end forward, the other back.
 */
export function outline(pts: Pt[], tool: ToolId, size: number, level: SmoothingLevel, complete: boolean): number[][] {
  const sm = smooth(pts, SMOOTHING[level], complete);
  if (tool === 'fountain') {
    const { left, right } = nibEdges(sm, size);
    return [...left, ...right.reverse()];
  }
  return getStroke(sm, { ...TOOLS[tool](size), last: complete });
}

// The fountain pen has a broad italic nib (owner feedback, D-043): a flat edge held at a fixed
// 30° slant. The mark is the area the edge sweeps, so it is thick on downstrokes and a fine
// hairline when the pen moves along the edge, like a calligraphy pen. Pressure widens it a little.
export const NIB_ANGLE = (30 * Math.PI) / 180;
const NIB = { x: Math.cos(NIB_ANGLE), y: -Math.sin(NIB_ANGLE) }; // up and to the right (y is down)

/** Half the nib's length for a sample: size 5 is a ~0.65 mm italic, fine enough for everyday handwriting. */
const nibHalf = (size: number, p: number) => size * 0.44 * (0.7 + 0.6 * p);

/** The two ends of the nib edge at each smoothed sample. */
export function nibEdges(pts: Pt[], size: number): { left: number[][]; right: number[][] } {
  const left: number[][] = [], right: number[][] = [];
  for (const [x, y, p] of pts) {
    const h = nibHalf(size, p);
    left.push([x + NIB.x * h, y + NIB.y * h]);
    right.push([x - NIB.x * h, y - NIB.y * h]);
  }
  return { left, right };
}

/**
 * The stroke as a fillable path. Fountain: the italic nib's sweep, one quad per segment, all wound
 * the same way so the nonzero fill unions them, plus a fine hairline so strokes along the nib's
 * edge never vanish. Ballpoint: the perfect-freehand outline.
 */
export function strokePath(pts: Pt[], tool: ToolId, size: number, level: SmoothingLevel, complete: boolean): Path2D {
  if (tool !== 'fountain') return outlinePath(outline(pts, tool, size, level, complete));
  const sm = smooth(pts, SMOOTHING[level], complete);
  const path = new Path2D();
  const { left: L, right: R } = nibEdges(sm, size);
  for (let i = 0; i + 1 < sm.length; i++) quad(path, L[i]!, L[i + 1]!, R[i + 1]!, R[i]!);
  if (sm.length === 1) quad(path, L[0]!, L[0]!, R[0]!, R[0]!);
  path.addPath(outlinePath(getStroke(sm, { size: Math.max(0.9, size * 0.18), thinning: 0, smoothing: 0.6, streamline: 0, simulatePressure: false, last: complete })));
  return path;
}

function quad(path: Path2D, a: number[], b: number[], c: number[], d: number[]) {
  // Shoelace sign: keep every quad clockwise so overlapping quads add up instead of cancelling.
  const area = (b[0]! - a[0]!) * (b[1]! + a[1]!) + (c[0]! - b[0]!) * (c[1]! + b[1]!) + (d[0]! - c[0]!) * (d[1]! + c[1]!) + (a[0]! - d[0]!) * (a[1]! + d[1]!);
  const pts = area < 0 ? [a, b, c, d] : [a, d, c, b];
  path.moveTo(pts[0]![0]!, pts[0]![1]!);
  for (let i = 1; i < 4; i++) path.lineTo(pts[i]![0]!, pts[i]![1]!);
  path.closePath();
}

/** SVG path data for the toolbar's fountain swatch: a wave drawn with the italic nib (24-unit box). */
export function nibSwatchPath(size: number): string {
  const pts: Pt[] = [];
  for (let x = 4; x <= 20.01; x += 0.5) pts.push([x, 12.5 - 3.6 * Math.sin(((x - 4) / 16) * 2 * Math.PI), 0.5, 1, 0, 0]);
  const { left: L, right: R } = nibEdges(pts, Math.min(3.2, Math.max(1.4, size * 0.45)));
  const f = (p: number[]) => `${p[0]!.toFixed(2)} ${p[1]!.toFixed(2)}`;
  let d = '';
  for (let i = 0; i + 1 < pts.length; i++) {
    // Same winding for every quad, so the nonzero fill unions them.
    const q = [L[i]!, L[i + 1]!, R[i + 1]!, R[i]!];
    const area = q.reduce((s, a, k) => { const b = q[(k + 1) % 4]!; return s + (b[0]! - a[0]!) * (b[1]! + a[1]!); }, 0);
    const o = area < 0 ? q : [q[0]!, q[3]!, q[2]!, q[1]!];
    d += `M${f(o[0]!)}L${f(o[1]!)}L${f(o[2]!)}L${f(o[3]!)}Z`;
  }
  return d;
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

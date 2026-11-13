// Ink pipeline: raw Pencil samples → smoothed points → outline path.
// 1. 1€ filter on position (Casiez, Roussel, Vogel, CHI 2012): the cutoff rises with speed,
//    so slow strokes lose the 0.5 px input quantisation jitter and fast strokes don't lag.
// 2. Light low-pass on pressure, so the pre-lift pressure spike doesn't swell the end.
// 3. At pen-up, settle the filter on the last real sample instead of drawing the lift-off
//    sample (it jumps ~4 px sideways and is what drew the blob/hook at stroke ends).
// 4. Draw the outline with quadratic curves through midpoints, not straight segments
//    (PencilKit likewise stores strokes as splines, not polylines).
export type Pt = [x: number, y: number, p: number, alt: number, az: number, t: number];
export interface Smoothing { minCutoff: number; beta: number }

export const SMOOTHING: Record<'low' | 'medium' | 'high', Smoothing> = {
  low: { minCutoff: 4, beta: 0.04 },
  medium: { minCutoff: 2, beta: 0.025 },
  high: { minCutoff: 1, beta: 0.015 },
};
const D_CUTOFF = 8; // Hz, for the speed estimate
const P_ALPHA = 0.2; // per-sample pressure EMA (~20 ms at 240 Hz)
const SETTLE_STEPS = 30; // pen-up: converge onto the last real sample (stops within 0.1 px)
const alpha = (fc: number, dt: number) => { const r = 2 * Math.PI * fc * dt; return r / (r + 1); };

/** Smooth a stroke. Pure: same input → same output, so live and committed ink match. */
export function smooth(raw: Pt[], cfg: Smoothing, final: boolean): Pt[] {
  if (raw.length === 0) return [];
  const out: Pt[] = [raw[0]];
  let [x, y, p] = raw[0];
  let vx = 0, vy = 0, t = raw[0][5];
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
  for (let i = 1; i < raw.length; i++) step(raw[i], raw[i][5]);
  if (final && raw.length > 1) {
    const last = raw[raw.length - 1];
    for (let k = 1; k <= SETTLE_STEPS && Math.hypot(last[0] - x, last[1] - y) > 0.1; k++) step(last, last[5] + k * 4);
  }
  return out;
}

/** Fill a perfect-freehand outline with quadratic curves through edge midpoints. */
export function fillOutline(ctx: CanvasRenderingContext2D, o: number[][]) {
  const n = o.length;
  if (n < 3) return;
  ctx.beginPath();
  ctx.moveTo((o[0][0] + o[1][0]) / 2, (o[0][1] + o[1][1]) / 2);
  for (let i = 1; i <= n; i++) {
    const a = o[i % n], b = o[(i + 1) % n];
    ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  ctx.closePath();
  ctx.fill();
}

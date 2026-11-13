// S1 · Ink latency spike (TDD §5.2, §5.4, §5.7).
// Questions: does Pencil ink feel like paper in Safari, what sample rate do we
// get, what is the real rAF rate on ProMotion, and how much app work per frame?
import { getStroke, type StrokeOptions } from 'perfect-freehand';
import { hud, set, note, setBusy, toggle, button, saveJson } from '../shared/hud.ts';
import './ink.css';

type Pt = [x: number, y: number, p: number, alt: number, az: number, t: number];
type Preset = 'fountain' | 'ballpoint';
interface Stroke { preset: Preset; pts: Pt[] }
type PenEvent = PointerEvent & { altitudeAngle?: number; azimuthAngle?: number };

const PRESETS: Record<Preset, StrokeOptions> = {
  fountain: { size: 5, thinning: 0.65, smoothing: 0.55, streamline: 0.35, simulatePressure: false,
    start: { taper: 6 }, end: { taper: 10 } },
  ballpoint: { size: 2.8, thinning: 0.1, smoothing: 0.5, streamline: 0.35, simulatePressure: false },
};
const INK = '#1e2a3a';

const opts = { coalesced: true, predicted: true, preset: 'fountain' as Preset, palmGuard: true };
const PALM_GUARD_MS = 500; // ignore finger touches this long after the pen lifts
let pan = { x: 0, y: 0 }; // page space = client - pan (S1b, D-007)
let touchPan: { id: number; sx: number; sy: number; px: number; py: number } | null = null;
let lastPenUp = -Infinity;
const strokes: Stroke[] = [];
let cur: (Stroke & { pointerId: number }) | null = null;
let predicted: Pt[] = [];
let nib: { x: number; y: number } | null = null;
let needsDraw = false;

// ---- canvases -------------------------------------------------------------
const committedEl = document.getElementById('committed') as HTMLCanvasElement;
const liveEl = document.getElementById('live') as HTMLCanvasElement;
const committed = committedEl.getContext('2d')!;
const live = liveEl.getContext('2d', { desynchronized: true })!;

function resize() {
  const dpr = devicePixelRatio;
  for (const [el, ctx] of [[committedEl, committed], [liveEl, live]] as const) {
    el.width = Math.round(innerWidth * dpr);
    el.height = Math.round(innerHeight * dpr);
    ctx.fillStyle = INK;
  }
  redrawCommitted();
}
addEventListener('resize', resize);

function clear(ctx: CanvasRenderingContext2D) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const dpr = devicePixelRatio;
  ctx.setTransform(dpr, 0, 0, dpr, pan.x * dpr, pan.y * dpr);
}

// ponytail: full redraw on pan; the real app uses cached tiles (TDD §5.5).
function redrawCommitted() {
  clear(committed);
  for (const s of strokes) fill(committed, s.pts, s.preset, true);
}

function fill(ctx: CanvasRenderingContext2D, pts: Pt[], preset: Preset, complete: boolean) {
  const outline = getStroke(pts, { ...PRESETS[preset], last: complete });
  if (outline.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i][0], outline[i][1]);
  ctx.closePath();
  ctx.fill();
}

// ---- per-stroke measurements ----------------------------------------------
const stats = {
  downEventTs: 0, firstInkMs: -1, samples: 0, emptyCoalesced: 0,
  handlerMs: 0, appWork: [] as number[], latency: [] as number[], lastEventTs: 0,
  outlineMax: 0, frameDeltas: [] as number[], hasPressure: false, hasTilt: false,
};
const idleDeltas: number[] = [];

function sample(e: PenEvent, down = false): Pt {
  let p = e.pressure;
  if (down && p === 0) p = 0.5; // PEN-5
  p = Math.min(1, Math.max(0, p));
  if (p !== 0.5 && p !== 0) stats.hasPressure = true;
  const alt = e.altitudeAngle ?? Math.PI / 2;
  if (alt !== Math.PI / 2) stats.hasTilt = true;
  return [e.clientX - pan.x, e.clientY - pan.y, p, alt, e.azimuthAngle ?? 0, e.timeStamp];
}

// ---- S1b: iOS suppression + finger pan with palm guard -----------------------
// Non-passive touch listeners stop the selection loupe, callout and double-tap zoom
// that CSS alone does not always prevent. Pointer events still fire.
for (const type of ['touchstart', 'touchmove'] as const)
  liveEl.addEventListener(type, (e) => e.preventDefault(), { passive: false });

const palm = { pansStarted: 0, pansCancelledByPen: 0, touchesIgnored: 0 };
function palmStats() {
  set('pans started', palm.pansStarted);
  set('pans cancelled by pen (palm landed first)', palm.pansCancelledByPen);
  set('touches ignored (palm guard)', palm.touchesIgnored);
}

liveEl.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  if (opts.palmGuard && (cur || performance.now() - lastPenUp < PALM_GUARD_MS)) { palm.touchesIgnored++; return palmStats(); }
  if (touchPan) return; // one finger pans; extra fingers are ignored in this spike
  touchPan = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
  palm.pansStarted++;
});
liveEl.addEventListener('pointermove', (e) => {
  if (!touchPan || e.pointerId !== touchPan.id) return;
  pan = { x: touchPan.px + e.clientX - touchPan.sx, y: touchPan.py + e.clientY - touchPan.sy };
  redrawCommitted();
});
for (const type of ['pointerup', 'pointercancel'] as const)
  liveEl.addEventListener(type, (e) => { if (touchPan?.id === e.pointerId) { touchPan = null; palmStats(); } });

// ---- input ------------------------------------------------------------------
liveEl.addEventListener('pointerdown', (e: PenEvent) => {
  if (e.pointerType !== 'pen') return;
  const t0 = performance.now();
  if (touchPan) { touchPan = null; palm.pansCancelledByPen++; palmStats(); } // a "pan" that was really a palm
  try { liveEl.setPointerCapture(e.pointerId); } catch { /* synthetic test pointers can't be captured */ }
  setBusy(true);
  nib = null;
  Object.assign(stats, { downEventTs: e.timeStamp, firstInkMs: -1, samples: 1, emptyCoalesced: 0,
    handlerMs: 0, appWork: [], latency: [], lastEventTs: e.timeStamp, outlineMax: 0, frameDeltas: [] });
  cur = { preset: opts.preset, pts: [sample(e, true)], pointerId: e.pointerId };
  needsDraw = true;
  stats.handlerMs += performance.now() - t0;
});

liveEl.addEventListener('pointermove', (e: PenEvent) => {
  if (e.pointerType !== 'pen') return;
  if (!cur) {
    if (e.buttons === 0) { nib = { x: e.clientX - pan.x, y: e.clientY - pan.y }; needsDraw = true; } // PEN-8 hover
    return;
  }
  if (e.pointerId !== cur.pointerId) return; // compare the parent event only (Safari 18.2 coalesced id bug)
  const t0 = performance.now();
  let events: PenEvent[] = opts.coalesced ? (e.getCoalescedEvents?.() ?? []) : [];
  if (events.length === 0) { events = [e]; if (opts.coalesced) stats.emptyCoalesced++; }
  for (const ev of events) cur.pts.push(sample(ev));
  stats.samples += events.length;
  predicted = opts.predicted ? (e.getPredictedEvents?.() ?? []).map((ev) => sample(ev)) : [];
  stats.lastEventTs = e.timeStamp;
  needsDraw = true;
  stats.handlerMs += performance.now() - t0;
});

function end(e: PenEvent) {
  if (!cur || e.pointerId !== cur.pointerId) return;
  if (e.type === 'pointerup') cur.pts.push(sample(e));
  const s = cur;
  cur = null;
  predicted = [];
  strokes.push(s);
  lastPenUp = performance.now();
  fill(committed, s.pts, s.preset, true);
  clear(live);
  if (e.type !== 'pointerup') note(`stroke ended by ${e.type} (kept, ${s.pts.length} pts)`);
  report(s);
  setBusy(false);
}
liveEl.addEventListener('pointerup', end);
liveEl.addEventListener('pointercancel', end);
liveEl.addEventListener('lostpointercapture', end);
liveEl.addEventListener('pointerleave', () => { nib = null; needsDraw = true; });

// ---- frame loop -------------------------------------------------------------
let lastFrame = 0;
function frame(now: number) {
  const delta = lastFrame ? now - lastFrame : 0;
  lastFrame = now;
  if (delta) (cur ? stats.frameDeltas : idleDeltas).push(delta);
  if (idleDeltas.length > 240) idleDeltas.shift();

  if (needsDraw) {
    needsDraw = false;
    const t0 = performance.now();
    clear(live);
    if (cur) {
      const pts = predicted.length ? cur.pts.concat(predicted) : cur.pts;
      fill(live, pts, cur.preset, false);
      const t1 = performance.now();
      stats.outlineMax = Math.max(stats.outlineMax, t1 - t0);
      stats.appWork.push(stats.handlerMs + (t1 - t0)); // the 8 ms budget is about this number
      stats.handlerMs = 0;
      stats.latency.push(t1 - stats.lastEventTs); // includes waiting for this frame
      if (stats.firstInkMs < 0) stats.firstInkMs = t1 - stats.downEventTs;
    } else if (nib) {
      const r = (PRESETS[opts.preset].size ?? 4) / 2;
      live.globalAlpha = 0.35;
      live.beginPath();
      live.arc(nib.x, nib.y, r, 0, Math.PI * 2);
      live.fill();
      live.globalAlpha = 1;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---- reporting --------------------------------------------------------------
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
const pct = (a: number[], q: number) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };

function report(s: Stroke) {
  const durS = (s.pts[s.pts.length - 1][5] - s.pts[0][5]) / 1000;
  const d = stats.frameDeltas;
  const med = median(d.length > 10 ? d : idleDeltas);
  const dropped = d.filter((x) => x > 1.5 * med).length;
  set('rAF Hz (measured)', med ? 1000 / med : 0);
  set('samples/s (last stroke)', durS > 0.05 ? stats.samples / durS : 0);
  set('points (last stroke)', s.pts.length);
  set('empty coalesced lists', stats.emptyCoalesced);
  set('pen-down → first ink ms (event ts)', stats.firstInkMs);
  set('app work/frame p50 ms', median(stats.appWork));
  set('app work/frame p95 ms', pct(stats.appWork, 0.95));
  set('event → drawn p50 ms', median(stats.latency));
  set('outline+fill max ms', stats.outlineMax);
  set('dropped frames % (>1.5× median)', d.length ? (dropped / d.length) * 100 : 0);
  set('frames in stroke', d.length);
  set('pressure reported', stats.hasPressure);
  set('tilt reported', stats.hasTilt);
  set('strokes on page', strokes.length);
}

// ---- controls ---------------------------------------------------------------
hud('ink');
set('getCoalescedEvents', typeof PointerEvent.prototype.getCoalescedEvents === 'function');
set('getPredictedEvents', typeof PointerEvent.prototype.getPredictedEvents === 'function');
set('dpr', devicePixelRatio);
toggle('coalesced', true, (v) => (opts.coalesced = v));
toggle('predicted', true, (v) => (opts.predicted = v));
const presetBtn = button(`pen: ${opts.preset}`, () => {
  opts.preset = opts.preset === 'fountain' ? 'ballpoint' : 'fountain';
  presetBtn.textContent = `pen: ${opts.preset}`;
});
toggle('palm guard', true, (v) => (opts.palmGuard = v));
button('Clear', () => { strokes.length = 0; pan = { x: 0, y: 0 }; redrawCommitted(); });
button('Export page', () =>
  saveJson('/__sample', {
    kind: 'morning-pages-sample', version: 1, userAgent: navigator.userAgent, dpr: devicePixelRatio,
    width: innerWidth, height: innerHeight, strokes,
  }, 'page.json'),
);
setInterval(() => { if (!cur && idleDeltas.length) set('rAF Hz (idle)', 1000 / median(idleDeltas)); }, 1000);
resize();

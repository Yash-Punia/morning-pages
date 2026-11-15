// Writing performance, measured on the device (TDD 5.7, D-018). Shown in /diagnostics.
const KEEP = 2000;
const firstInk: number[] = []; // ms from the pen-down event to the first live draw
const deltas: number[] = []; // recent rAF deltas while a stroke is active, for the frame rate
/** Every frame delta of the session while writing, by bucket: a 5-minute session is ~36,000
 *  frames at 120 Hz, more than the sample keeps. Bounds are 1.5 frames at 120 Hz and at 60 Hz. */
const BOUNDS = [12.5, 25, 50] as const;
const buckets = [0, 0, 0, 0];
let writingMs = 0;
let samples = 0; // pen samples kept, and the time they span, for the sample rate (TDD 13.3)
let sampleMs = 0;
let hovered = false;
let pending = -1;
let lastFrame = 0;
/** The last few finger contacts and what scrolling made of them (D-042 calibration). */
const touches: { contact: number; verdict: string; held: number }[] = [];

/** Launch → the first page painted and ready for ink (TDD 5.7). Only a launch that opens onto a
 *  writing screen counts; main.ts calls `noLaunch()` otherwise. */
let launchState: 'waiting' | 'done' = 'waiting';
let resolveLaunch: (ms: number) => void = () => {};
const launch = new Promise<number>((r) => (resolveLaunch = r));
let openStart = -1;
let lastOpen: { ms: number; pages: number } | null = null;

export const inkMetrics = {
  touch(contact: number, verdict: string, held: number) {
    touches.push({ contact: Math.round(contact), verdict, held });
    if (touches.length > 8) touches.shift();
  },
  touches: () => [...touches],
  hover() {
    hovered = true;
  },
  penDown(eventTime: number) {
    pending = eventTime;
    lastFrame = 0;
  },
  /** Call after the live layer has been drawn for a frame while writing. */
  drawn(now = performance.now()) {
    if (pending >= 0) push(firstInk, now - pending);
    pending = -1;
    if (lastFrame) {
      const d = now - lastFrame;
      push(deltas, d);
      writingMs += d;
      buckets[bucket(d)]!++;
    }
    lastFrame = now;
  },
  /** A stroke ended with `n` samples spanning `ms`. */
  penUp(n = 0, ms = 0) {
    lastFrame = 0;
    if (n > 1 && ms > 0) { samples += n - 1; sampleMs += ms; }
  },
  /** An entry starts loading (Today or a saved morning). */
  opening(now = performance.now()) {
    openStart = now;
  },
  /** Its first page is painted and takes ink. The first one after launch is the cold launch. */
  opened(pages: number, now = performance.now()) {
    if (openStart >= 0) lastOpen = { ms: now - openStart, pages };
    openStart = -1;
    if (launchState === 'waiting') {
      launchState = 'done';
      performance.mark?.('writable');
      resolveLaunch(now);
    }
  },
  noLaunch() {
    launchState = 'done';
  },
  /** Resolves with ms since navigation start, if this launch opened onto a writing screen. */
  launch,
  lastOpen: () => lastOpen,
  summary() {
    const med = pct(deltas, 0.5);
    const frames = buckets.reduce((a, b) => a + b, 0);
    // A frame is dropped when it took over 1.5 refresh periods: 12.5 ms at 120 Hz, 25 ms at 60 Hz.
    const over = med && med < BOUNDS[0] ? frames - buckets[0]! : buckets[2]! + buckets[3]!;
    return {
      firstInkP50: pct(firstInk, 0.5),
      firstInkP95: pct(firstInk, 0.95),
      hz: med ? 1000 / med : 0,
      droppedPct: frames ? (over / frames) * 100 : 0,
      frames,
      buckets: [...buckets],
      writingMin: writingMs / 60_000,
      sampleHz: sampleMs ? (samples / sampleMs) * 1000 : 0,
      strokes: firstInk.length,
      hovered,
    };
  },
};

function bucket(d: number) {
  const i = BOUNDS.findIndex((b) => d <= b);
  return i < 0 ? BOUNDS.length : i;
}
function push(list: number[], v: number) {
  list.push(v);
  if (list.length > KEEP) list.shift();
}
/** The q-th quantile of a list (nearest rank). */
export function pct(list: readonly number[], q: number) {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
}

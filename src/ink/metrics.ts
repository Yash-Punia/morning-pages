// Writing performance, measured on the device (TDD 5.7, D-018). Shown in /diagnostics.
const KEEP = 2000;
const firstInk: number[] = []; // ms from the pen-down event to the first live draw
const deltas: number[] = []; // rAF deltas while a stroke is active
let pending = -1;
let lastFrame = 0;

export const inkMetrics = {
  penDown(eventTime: number) {
    pending = eventTime;
    lastFrame = 0;
  },
  /** Call after the live layer has been drawn for a frame while writing. */
  drawn(now = performance.now()) {
    if (pending >= 0) push(firstInk, now - pending);
    pending = -1;
    if (lastFrame) push(deltas, now - lastFrame);
    lastFrame = now;
  },
  penUp() {
    lastFrame = 0;
  },
  summary() {
    const med = pct(deltas, 0.5);
    return {
      firstInkP50: pct(firstInk, 0.5),
      firstInkP95: pct(firstInk, 0.95),
      hz: med ? 1000 / med : 0,
      droppedPct: deltas.length && med ? (deltas.filter((d) => d > med * 1.5).length / deltas.length) * 100 : 0,
      strokes: firstInk.length,
    };
  },
};

function push(list: number[], v: number) {
  list.push(v);
  if (list.length > KEEP) list.shift();
}
function pct(list: number[], q: number) {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
}

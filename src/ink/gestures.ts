// Finger scrolling on the writing surface (D-042). touch-action is none, so the app owns
// scrolling, and it does exactly one thing: one finger scrolls, with inertia. No pinch zoom and no
// multi-finger taps: a resting palm registers as several touches and was read as gestures,
// undoing strokes and zooming the page (owner feedback, M2). So:
// - a second touch cancels any scroll until every finger has lifted;
// - palm-sized contacts are ignored;
// - the Pencil cancels any scroll, and touches just after it lifts are a resting palm.

export interface GestureSink {
  pan(dx: number, dy: number): void;
}

const PALM_GUARD_MS = 500;
const PALM_SIZE = 40; // CSS px of contact: a fingertip is ~10–25, a resting palm is larger
const FRICTION = 0.998; // per ms, close to iOS's normal scroll deceleration
const MIN_SPEED = 0.02; // px/ms

export class Gestures {
  private finger: { id: number; x: number; y: number } | null = null;
  private touches = new Set<number>();
  private locked = false; // more than one contact: nothing scrolls until all lift
  private penDown = false;
  private penBlockUntil = -Infinity;
  private moves: { t: number; dx: number; dy: number }[] = [];
  private inertia = 0;

  private pair: Map<number, { x: number; y: number }> | null = null;

  constructor(
    private sink: GestureSink,
    /** "Draw with finger" mode: one finger writes, so two fingers together scroll (no zoom). */
    private twoFingerScroll = false,
    private raf: (cb: (t: number) => void) => number = (cb) => requestAnimationFrame(cb),
    private caf: (id: number) => void = (id) => cancelAnimationFrame(id),
  ) {}

  /** Returns true when this touch takes part in scrolling. */
  down(id: number, x: number, y: number, t: number, contact = 0): boolean {
    this.touches.add(id);
    if (this.twoFingerScroll && this.touches.size === 2 && !this.locked && !this.penDown) {
      this.pair = new Map([[id, { x, y }]]);
      if (this.finger) this.pair.set(this.finger.id, { x: this.finger.x, y: this.finger.y });
      this.finger = null;
      return true;
    }
    if (this.touches.size > 1) { this.cancel(); this.locked = true; return false; }
    if (this.penDown || t < this.penBlockUntil || contact > PALM_SIZE) { this.locked = true; return false; }
    this.stopInertia();
    this.finger = { id, x, y };
    this.moves = [];
    return true;
  }

  move(id: number, x: number, y: number, t: number) {
    const p = this.pair?.get(id);
    if (p && this.pair!.size === 2) {
      // Two fingers scroll by half of each finger's movement: the midpoint's travel.
      this.sink.pan((x - p.x) / 2, (y - p.y) / 2);
      p.x = x;
      p.y = y;
      return;
    }
    const f = this.finger;
    if (this.locked || !f || f.id !== id) return;
    const dx = x - f.x, dy = y - f.y;
    f.x = x;
    f.y = y;
    this.sink.pan(dx, dy);
    this.moves.push({ t, dx, dy });
    while (this.moves.length && t - this.moves[0]!.t > 80) this.moves.shift();
  }

  up(id: number, t: number) {
    this.touches.delete(id);
    if (this.pair?.has(id)) { this.pair = null; this.locked = this.touches.size > 0; } // no fling, no 1-finger takeover
    const wasFinger = this.finger?.id === id && !this.locked;
    if (this.finger?.id === id) this.finger = null;
    if (wasFinger) this.fling(t);
    if (this.touches.size === 0) this.locked = false;
  }

  /** The pen always wins: it cancels any scroll (a palm that landed first) and inertia. */
  penStart() {
    this.penDown = true;
    this.cancel();
    this.locked = this.touches.size > 0;
  }
  penEnd(t: number) {
    this.penDown = false;
    this.penBlockUntil = t + PALM_GUARD_MS;
  }

  get active() {
    return this.touches.size > 0 || this.inertia !== 0;
  }

  private cancel() {
    this.finger = null;
    this.pair = null;
    this.moves = [];
    this.stopInertia();
  }

  private fling(t: number) {
    const recent = this.moves.filter((m) => t - m.t <= 80);
    if (recent.length < 2) return;
    const span = Math.max(16, t - recent[0]!.t);
    let vx = recent.reduce((s, m) => s + m.dx, 0) / span;
    let vy = recent.reduce((s, m) => s + m.dy, 0) / span;
    let last = 0;
    const step = (now: number) => {
      const dt = last ? Math.min(32, now - last) : 16;
      last = now;
      this.sink.pan(vx * dt, vy * dt);
      const decay = FRICTION ** dt;
      vx *= decay;
      vy *= decay;
      this.inertia = Math.hypot(vx, vy) > MIN_SPEED ? this.raf(step) : 0;
    };
    this.inertia = this.raf(step);
  }

  stopInertia() {
    if (this.inertia) this.caf(this.inertia);
    this.inertia = 0;
  }
}

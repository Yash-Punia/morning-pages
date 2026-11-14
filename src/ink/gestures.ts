// Finger gestures on the writing surface (TDD 5.3, D-007, PEN-7). touch-action is none, so the
// app owns scrolling: one finger pans with inertia, two fingers pinch and pan, quick two- and
// three-finger taps are undo and redo. Fingers never ink here (palm rejection by input type).

export interface GestureSink {
  pan(dx: number, dy: number): void;
  /** Multiply zoom by `factor` around (cx, cy), then pan by (dx, dy). */
  pinch(factor: number, cx: number, cy: number, dx: number, dy: number): void;
  tap(fingers: 2 | 3): void;
}

const TAP_MS = 250;
const TAP_TRAVEL = 10;
const PALM_GUARD_MS = 500; // touches right after the pen lifts are a resting palm (S1b)
const FRICTION = 0.998; // per ms, close to iOS's normal scroll deceleration
const MIN_SPEED = 0.02; // px/ms

type Touch = { x: number; y: number };

export class Gestures {
  private touches = new Map<number, Touch>();
  private maxFingers = 0;
  private startT = 0;
  private travel = 0;
  private penDown = false;
  private penBlockUntil = -Infinity;
  private moves: { t: number; dx: number; dy: number }[] = [];
  private pinchFrom: { dist: number; mx: number; my: number } | null = null;
  private inertia = 0;

  constructor(
    private sink: GestureSink,
    private raf: (cb: (t: number) => void) => number = (cb) => requestAnimationFrame(cb),
    private caf: (id: number) => void = (id) => cancelAnimationFrame(id),
  ) {}

  /** Returns false when the touch is ignored (pen active or palm guard). */
  down(id: number, x: number, y: number, t: number): boolean {
    if (this.penDown || t < this.penBlockUntil) return false;
    this.stopInertia();
    if (this.touches.size === 0) Object.assign(this, { startT: t, travel: 0, maxFingers: 0, moves: [] });
    this.touches.set(id, { x, y });
    this.maxFingers = Math.max(this.maxFingers, this.touches.size);
    this.pinchFrom = this.touches.size >= 2 ? this.pinchState() : null;
    return true;
  }

  move(id: number, x: number, y: number, t: number) {
    const touch = this.touches.get(id);
    if (!touch) return;
    const dx = x - touch.x;
    const dy = y - touch.y;
    touch.x = x;
    touch.y = y;
    this.travel += Math.hypot(dx, dy);
    if (this.touches.size === 1) {
      this.sink.pan(dx, dy);
      this.moves.push({ t, dx, dy });
      while (this.moves.length && t - this.moves[0]!.t > 80) this.moves.shift();
    } else if (this.pinchFrom) {
      const now = this.pinchState();
      this.sink.pinch(now.dist / this.pinchFrom.dist, now.mx, now.my, now.mx - this.pinchFrom.mx, now.my - this.pinchFrom.my);
      this.pinchFrom = now;
    }
  }

  up(id: number, t: number) {
    if (!this.touches.delete(id)) return;
    if (this.touches.size >= 2) this.pinchFrom = this.pinchState();
    else this.pinchFrom = null;
    if (this.touches.size > 0) { this.moves = []; return; } // fingers lifting one by one: no fling
    const quick = t - this.startT < TAP_MS && this.travel < TAP_TRAVEL;
    if (quick && this.maxFingers >= 2) this.sink.tap(this.maxFingers >= 3 ? 3 : 2);
    else if (this.maxFingers === 1) this.fling(t);
  }

  /** The pen always wins: it cancels any pan in progress (a palm that landed first) and inertia. */
  penStart() {
    this.penDown = true;
    this.touches.clear();
    this.pinchFrom = null;
    this.stopInertia();
  }
  penEnd(t: number) {
    this.penDown = false;
    this.penBlockUntil = t + PALM_GUARD_MS;
  }

  get active() {
    return this.touches.size > 0 || this.inertia !== 0;
  }

  private pinchState() {
    const [a, b] = [...this.touches.values()] as [Touch, Touch];
    return { dist: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
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

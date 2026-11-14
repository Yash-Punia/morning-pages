// Finger scrolling on the writing surface (D-042, D-048). touch-action is none, so the app owns
// scrolling, and it does exactly one thing: one finger scrolls, with inertia. Everything else that
// touches the glass while writing is a hand, and must never scroll. iOS gives a web page no palm
// flag, so each touch is classified from what it does give (size, place, motion, time):
// - a second contact cancels any scroll until every finger has lifted;
// - the Pencil cancels any scroll; touches just after it lifts are a resting palm;
// - palm-sized contacts are ignored, also when they grow to that size (they land on an edge);
// - the hand zone: below and right of where a right-handed writer's Pencil just was, a touch is
//   the writing hand (the inactive region of Microsoft's palm rejection, Vogel's occlusion model);
// - direction: this page only scrolls vertically, so a contact that first slides sideways is a
//   hand moving to the next line, not a finger (iOS scroll views lock direction the same way);
// - decisions are revisable for the first 500 ms (Schwarz et al., CHI '14): a scroll that turns
//   out to be a palm is undone.

export interface GestureSink {
  pan(dx: number, dy: number): void;
}

/** Why a touch did or didn't scroll, for the /diagnostics readout. */
export type TouchVerdict = 'scrolled' | 'tap' | 'two-finger scroll' | 'second contact' | 'pen down' | 'pen guard'
  | 'palm size' | 'hand zone' | 'sideways' | 'grew to palm' | 'pen came down';
export type TouchLog = (contact: number, verdict: TouchVerdict, held: number) => void;

const PALM_GUARD_MS = 500;
// CSS px of contact. iOS reports 2 × UITouch.majorRadius, so a fingertip reads ~40–60 and a resting
// palm well over 90. (40 rejected real fingertips: nothing scrolled on the iPad.)
export const PALM_SIZE = 90;
/** Travel before a touch counts as a scroll, and its direction is judged (iOS uses ~10 pt). */
const SLOP = 10;
/** How long after the Pencil was last on or above the glass its hand zone applies. */
const HAND_ZONE_MS = 1500;
/** The hand zone around the last Pencil point, CSS px, for a right-handed writer: the palm rests
 *  below and to the right of the nib. ponytail: right-handed only (the owner); mirror x for left. */
const HAND_ZONE = { left: -80, right: 520, top: -160, bottom: 640 };
/** Early classification can be revised for this long (Schwarz et al. use windows up to 500 ms). */
const REVISE_MS = 500;
const FRICTION = 0.998; // per ms, close to iOS's normal scroll deceleration
const MIN_SPEED = 0.02; // px/ms

export class Gestures {
  private finger: {
    id: number; x: number; y: number; x0: number; y0: number; t0: number; contact: number;
    scrolling: boolean; panned: [number, number];
  } | null = null;
  private pen: { x: number; y: number; t: number } | null = null;
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
    private log: TouchLog = () => {},
  ) {}

  /** Returns true when this touch takes part in scrolling. */
  down(id: number, x: number, y: number, t: number, contact = 0): boolean {
    this.touches.add(id);
    const held = this.touches.size;
    if (this.twoFingerScroll && held === 2 && !this.locked && !this.penDown) {
      this.pair = new Map([[id, { x, y }]]);
      if (this.finger) this.pair.set(this.finger.id, { x: this.finger.x, y: this.finger.y });
      this.finger = null;
      this.log(contact, 'two-finger scroll', held);
      return true;
    }
    const refuse = (verdict: TouchVerdict) => {
      this.locked = true;
      this.log(contact, verdict, held);
      return false;
    };
    if (held > 1) { this.cancel(); return refuse('second contact'); }
    if (this.penDown) return refuse('pen down');
    if (t < this.penBlockUntil) return refuse('pen guard');
    if (contact > PALM_SIZE) return refuse('palm size');
    if (this.inHandZone(x, y, t)) return refuse('hand zone');
    this.stopInertia();
    // Not scrolling yet: it has to travel past the slop, vertically, first.
    this.finger = { id, x, y, x0: x, y0: y, t0: t, contact, scrolling: false, panned: [0, 0] };
    this.moves = [];
    return true;
  }

  /** Where the Pencil is, touching or hovering (surface CSS px): the writing hand is near it. */
  penAt(x: number, y: number, t: number) {
    this.pen = { x, y, t };
  }

  private inHandZone(x: number, y: number, t: number) {
    const p = this.pen;
    if (!p || t - p.t > HAND_ZONE_MS) return false;
    const dx = x - p.x, dy = y - p.y;
    return dx >= HAND_ZONE.left && dx <= HAND_ZONE.right && dy >= HAND_ZONE.top && dy <= HAND_ZONE.bottom;
  }

  /** This touch is a hand after all: undo any scroll it made, and ignore it until all lift. */
  private reject(verdict: TouchVerdict) {
    const f = this.finger!;
    if (f.panned[0] || f.panned[1]) this.sink.pan(-f.panned[0], -f.panned[1]);
    this.log(f.contact, verdict, this.touches.size);
    this.finger = null;
    this.moves = [];
    this.locked = true;
  }

  move(id: number, x: number, y: number, t: number, contact = 0) {
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
    f.contact = Math.max(f.contact, contact);
    if (contact > PALM_SIZE && t - f.t0 < REVISE_MS) return this.reject('grew to palm');
    if (!f.scrolling) {
      const tx = x - f.x0, ty = y - f.y0;
      if (Math.hypot(tx, ty) < SLOP) return;
      if (Math.abs(tx) > Math.abs(ty)) return this.reject('sideways');
      f.scrolling = true;
      this.log(f.contact, 'scrolled', this.touches.size);
    }
    const dx = x - f.x, dy = y - f.y; // from the start on the first move: no travel is lost
    f.x = x;
    f.y = y;
    this.sink.pan(dx, dy);
    if (t - f.t0 < REVISE_MS) f.panned = [f.panned[0] + dx, f.panned[1] + dy];
    this.moves.push({ t, dx, dy });
    while (this.moves.length && t - this.moves[0]!.t > 80) this.moves.shift();
  }

  up(id: number, t: number) {
    this.touches.delete(id);
    if (this.pair?.has(id)) { this.pair = null; this.locked = this.touches.size > 0; } // no fling, no 1-finger takeover
    const f = this.finger?.id === id ? this.finger : null;
    if (f && !f.scrolling) this.log(f.contact, 'tap', this.touches.size + 1); // never moved enough
    const wasFinger = !!f?.scrolling && !this.locked;
    if (f) this.finger = null;
    if (wasFinger) this.fling(t);
    if (this.touches.size === 0) this.locked = false;
  }

  /** The pen always wins: it cancels any scroll (a palm that landed first) and inertia. */
  penStart(t = Infinity) {
    this.penDown = true;
    // A scroll that began just before the Pencil touched was the palm landing first: undo it.
    if (this.finger?.scrolling && t - this.finger.t0 < REVISE_MS) this.reject('pen came down');
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

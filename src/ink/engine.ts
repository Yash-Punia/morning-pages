// Wires the writing surface together: sizing, iOS suppression, input, gestures, rendering.
// Grows step by step through M2; everything here is plain TS and testable through the DOM.
import { Gestures } from './gestures.ts';
import { A5_HEIGHT } from './types.ts';
import { Viewport } from './viewport.ts';

export class InkEngine {
  readonly view = new Viewport();
  private gestures: Gestures;
  private ro: ResizeObserver;
  private off: (() => void)[] = [];
  private frameId = 0;
  /** Surface origin in client coordinates and the device pixel ratio (D-037). */
  private origin = { x: 0, y: 0 };
  private dpr = 1;

  constructor(
    private host: HTMLElement,
    private committed: HTMLCanvasElement,
    private live: HTMLCanvasElement,
  ) {
    this.view.docHeight = A5_HEIGHT;
    this.gestures = new Gestures({
      pan: (dx, dy) => { this.view.panBy(dx, dy); this.invalidate(); },
      pinch: (f, cx, cy, dx, dy) => { this.view.zoomAt(this.view.zoom * f, cx, cy); this.view.panBy(dx, dy); this.invalidate(); },
      tap: () => {},
    });

    // PEN-2 / S1b: no selection loupe, callout, double-tap or pinch zoom from the browser.
    const prevent = (e: Event) => e.preventDefault();
    this.listen(host, 'touchstart', prevent, { passive: false });
    this.listen(host, 'touchmove', prevent, { passive: false });
    this.listen(host, 'gesturestart', prevent, { passive: false });
    this.listen(host, 'contextmenu', prevent);

    this.listen(host, 'pointerdown', (e) => this.onDown(e as PointerEvent));
    this.listen(host, 'pointermove', (e) => this.onMove(e as PointerEvent));
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) this.listen(host, t, (e) => this.onUp(e as PointerEvent));
    this.listen(host, 'wheel', (e) => this.onWheel(e as WheelEvent), { passive: false });

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
  }

  /** Backing stores follow the element's own box, never innerWidth/100vh (D-037). */
  resize() {
    const r = this.host.getBoundingClientRect();
    this.dpr = devicePixelRatio || 1;
    this.origin = { x: r.left, y: r.top };
    for (const c of [this.committed, this.live]) {
      c.width = Math.max(1, Math.round(r.width * this.dpr));
      c.height = Math.max(1, Math.round(r.height * this.dpr));
    }
    this.view.resize(r.width, r.height);
    this.invalidate();
  }

  /** Client coordinates → surface CSS px. */
  private local(e: { clientX: number; clientY: number }): [number, number] {
    return [e.clientX - this.origin.x, e.clientY - this.origin.y];
  }

  private onDown(e: PointerEvent) {
    const r = this.host.getBoundingClientRect(); // the spine may have moved the surface
    this.origin = { x: r.left, y: r.top };
    if (e.pointerType === 'pen') this.gestures.penStart();
    else if (e.pointerType === 'touch') this.gestures.down(e.pointerId, ...this.local(e), e.timeStamp);
  }

  private onMove(e: PointerEvent) {
    if (e.pointerType === 'touch') this.gestures.move(e.pointerId, ...this.local(e), e.timeStamp);
  }

  private onUp(e: PointerEvent) {
    if (e.type === 'lostpointercapture') return;
    if (e.pointerType === 'pen') this.gestures.penEnd(e.timeStamp);
    else if (e.pointerType === 'touch') this.gestures.up(e.pointerId, e.timeStamp);
  }

  /** Trackpads and mice: scroll, and ⌘/ctrl + scroll (or a trackpad pinch) to zoom. */
  private onWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) this.view.zoomAt(this.view.zoom * Math.exp(-e.deltaY * 0.01), ...this.local(e));
    else this.view.panBy(-e.deltaX, -e.deltaY);
    this.invalidate();
  }

  invalidate() {
    if (!this.frameId) this.frameId = requestAnimationFrame(() => this.frame());
  }

  private frame() {
    this.frameId = 0;
    const v = this.view;
    // Readable state for tests and /diagnostics; cheap string writes only when values change.
    const d = this.host.dataset;
    const sy = v.sy.toFixed(1), zoom = v.zoom.toFixed(3);
    if (d.scrollY !== sy) d.scrollY = sy;
    if (d.zoom !== zoom) d.zoom = zoom;
  }

  protected listen(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions) {
    target.addEventListener(type, fn, opts);
    this.off.push(() => target.removeEventListener(type, fn, opts));
  }

  destroy() {
    this.ro.disconnect();
    this.gestures.stopInertia();
    cancelAnimationFrame(this.frameId);
    for (const f of this.off) f();
  }
}

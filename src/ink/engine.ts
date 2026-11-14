// Wires the writing surface together: sizing, iOS suppression, input, gestures, rendering.
// Grows step by step through M2; everything here is plain TS and testable through the DOM.
import { inkSmoothing } from '../settings.ts';
import { resolveToken, watchTheme } from './colors.ts';
import { Gestures } from './gestures.ts';
import { appendSamples, coalesced, predicted, toPt } from './input.ts';
import { outline, outlinePath } from './stroke.ts';
import { A5_HEIGHT, type Pt, type ToolId } from './types.ts';
import { Viewport } from './viewport.ts';

interface Live { pointerId: number; pts: Pt[]; pred: Pt[] }
interface Done { pts: Pt[]; tool: ToolId; size: number }

export class InkEngine {
  readonly view = new Viewport();
  private gestures: Gestures;
  private ro: ResizeObserver;
  private off: (() => void)[] = [];
  private frameId = 0;
  /** Surface origin in client coordinates and the device pixel ratio (D-037). */
  private origin = { x: 0, y: 0 };
  private dpr = 1;
  private stroke: Live | null = null;
  private done: Done[] = []; // ponytail: redrawn whole each frame; tiles replace this in 2.5
  private preset = { tool: 'fountain' as ToolId, size: 5 };
  private smoothing = inkSmoothing.get();

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
    this.off.push(watchTheme(() => this.invalidate()));
    this.resize();
  }

  /** Client coordinates → document space. */
  private toDoc = (cx: number, cy: number): [number, number] => this.view.toDoc(cx - this.origin.x, cy - this.origin.y);

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
    if (e.pointerType === 'pen') this.penDown(e);
    else if (e.pointerType === 'touch') this.gestures.down(e.pointerId, ...this.local(e), e.timeStamp);
  }

  private onMove(e: PointerEvent) {
    if (e.pointerType === 'touch') this.gestures.move(e.pointerId, ...this.local(e), e.timeStamp);
    else if (e.pointerType === 'pen' && this.stroke && e.pointerId === this.stroke.pointerId) {
      // Compare the parent event's id only: Safari 18.2 coalesced events carry wrong ids (TDD 15).
      const s = this.stroke;
      appendSamples(s.pts, coalesced(e).map((c) => toPt(c, this.toDoc)));
      s.pred = predicted(e, s.pts[s.pts.length - 1]![5], this.toDoc);
      this.invalidate();
    }
  }

  private onUp(e: PointerEvent) {
    if (e.pointerType === 'pen') this.penUp(e);
    else if (e.pointerType === 'touch' && e.type !== 'lostpointercapture') this.gestures.up(e.pointerId, e.timeStamp);
  }

  private penDown(e: PointerEvent) {
    this.gestures.penStart();
    try { this.host.setPointerCapture(e.pointerId); } catch { /* synthetic or already-released pointers */ }
    this.stroke = { pointerId: e.pointerId, pts: [toPt(e, this.toDoc, true)], pred: [] };
    this.invalidate();
  }

  /** pointerup, pointercancel and lost capture all end the stroke, and all keep it (TDD 4.5). */
  private penUp(e: PointerEvent) {
    const s = this.stroke;
    if (!s || e.pointerId !== s.pointerId) return;
    // The pointerup sample is the lift-off (~4 px jump, pressure 0): never recorded (D-036).
    this.stroke = null;
    this.done.push({ pts: s.pts, ...this.preset });
    this.gestures.penEnd(e.timeStamp);
    this.invalidate();
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
    const ink = resolveToken('--ink');
    const committed = this.begin(this.committed);
    for (const d of this.done) this.fill(committed, d.pts, d.tool, d.size, ink, true);
    const live = this.begin(this.live);
    if (this.stroke) {
      const s = this.stroke;
      this.fill(live, s.pred.length ? s.pts.concat(s.pred) : s.pts, this.preset.tool, this.preset.size, ink, false);
    }
    // Readable state for tests and /diagnostics; cheap string writes only when values change.
    const d = this.host.dataset;
    const sy = v.sy.toFixed(1), zoom = v.zoom.toFixed(3);
    if (d.scrollY !== sy) d.scrollY = sy;
    if (d.zoom !== zoom) d.zoom = zoom;
  }

  /** Clear a layer and set the document → device-pixel transform. */
  private begin(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!;
    const { scale: s, sx, sy } = this.view;
    const k = s * this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(k, 0, 0, k, -sx * k, -sy * k);
    return ctx;
  }

  private fill(ctx: CanvasRenderingContext2D, pts: Pt[], tool: ToolId, size: number, color: string, complete: boolean) {
    ctx.fillStyle = color;
    ctx.fill(outlinePath(outline(pts, tool, size, this.smoothing, complete)));
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

// Wires the writing surface together: sizing, iOS suppression, input, gestures, rendering.
// Plain TS outside Svelte reactivity (TDD 3). Two layers: `committed` composites cached tiles of
// finished ink; `live` redraws only the stroke in progress (and its predicted tail) each frame.
import { fingerDrawing, inkPaper, inkSmoothing } from '../settings.ts';
import { drawPaper, SIDE, TITLE } from './paper.ts';
import { resolveToken, watchTheme } from './colors.ts';
import { Gestures } from './gestures.ts';
import { hits } from './hit.ts';
import { inkColor } from './inks.ts';
import { appendSamples, coalesced, predicted, toPt } from './input.ts';
import { inkMetrics } from './metrics.ts';
import { InkDoc } from './page.ts';
import { commands, history, tools, type Preset } from './tools.ts';
import { overlaps, TileCache, tileBox, tileRes, tileUnits, type Ctx2D, type Tile } from './renderer.ts';
import { NIB_ANGLE, strokePath } from './stroke.ts';
import { A5_HEIGHT, PAGE_WIDTH, type Box, type Pt, type StrokeOp } from './types.ts';
import { Viewport } from './viewport.ts';

interface Live { pointerId: number; pts: Pt[]; pred: Pt[]; finger: boolean; last: [number, number] }
interface Erasing { pointerId: number; ids: Set<string>; at: [number, number] }
export type Mode = 'pen' | 'eraser';
const ERASER_RADIUS = 10; // page units

export class InkEngine {
  readonly view = new Viewport();
  readonly doc: InkDoc;
  private dateLabel: string;
  private titleEl?: HTMLElement;
  preset: Preset = { tool: 'fountain', color: 'blueBlack', size: 5 };
  private tiles = new TileCache();
  private gestures: Gestures;
  private ro: ResizeObserver;
  private off: (() => void)[] = [];
  private frameId = 0;
  private composite = true; // the committed layer needs re-blitting
  /** Surface origin in client coordinates and the device pixel ratio (D-037). */
  private origin = { x: 0, y: 0 };
  private dpr = 1;
  private stroke: Live | null = null;
  private erasing: Erasing | null = null;
  private hover: [number, number] | null = null; // PEN-8: Pencil hovering above the glass
  /** What the Pencil does: write with the preset, or erase whole strokes (TDD 5.6). */
  mode: Mode = 'pen';
  private smoothing = inkSmoothing.get();
  private fingerDraw = fingerDrawing.get(); // PEN-7 setting

  constructor(
    private host: HTMLElement,
    private committed: HTMLCanvasElement,
    private live: HTMLCanvasElement,
    { doc, date, title }: { doc: InkDoc; date: Date; title?: HTMLElement },
  ) {
    this.doc = doc;
    this.titleEl = title;
    doc.setPaper(inkPaper.get()); // the Settings choice applies to today's pages too
    this.dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    this.view.docHeight = this.doc.height;
    this.doc.onChange = (box, added) => this.changed(box, added);
    // D-042: fingers only scroll (one finger, or two together in finger-drawing mode). No zoom,
    // no tap-to-undo: a resting palm was being read as those gestures.
    this.gestures = new Gestures({ pan: (dx, dy) => { this.view.panBy(dx, dy); this.invalidate(true); } }, this.fingerDraw);

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
    this.listen(window, 'keydown', (e) => this.onKey(e as KeyboardEvent));
    this.listen(host, 'pointerleave', () => { if (this.hover) { this.hover = null; this.invalidate(); } });

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.off.push(watchTheme(() => { this.tiles.drop(); this.invalidate(true); }));
    this.off.push(() => { this.doc.onChange = () => {}; });
    // The toolbar sets the preset and mode; the engine reports what can be undone.
    this.off.push(tools.subscribe((s) => { this.preset = s.presets[s.active]!; this.mode = s.mode; }));
    Object.assign(commands, { undo: () => this.undo(), redo: () => this.redo() });
    this.off.push(() => Object.assign(commands, { undo: () => {}, redo: () => {} }));
    this.reportHistory();
    // The printed date uses Fraunces; repaint once it has loaded (it is preloaded, so this is quick).
    Promise.all([document.fonts.load('520 36px "Fraunces Variable"'), document.fonts.load('400 18px "Atkinson Hyperlegible Next Variable"')])
      .then(() => { this.tiles.drop(); this.invalidate(true); }, () => {});
    this.resize();
    if (import.meta.env.VITE_E2E === '1') (window as unknown as { __ink: InkEngine }).__ink = this;
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
    this.invalidate(true);
  }

  /** Client coordinates → surface CSS px. */
  private local(e: { clientX: number; clientY: number }): [number, number] {
    return [e.clientX - this.origin.x, e.clientY - this.origin.y];
  }
  /** Client coordinates → document space. */
  private toDoc = (cx: number, cy: number): [number, number] => this.view.toDoc(cx - this.origin.x, cy - this.origin.y);

  private onDown(e: PointerEvent) {
    const r = this.host.getBoundingClientRect(); // the spine may have moved the surface
    this.origin = { x: r.left, y: r.top };
    if (e.pointerType === 'pen') this.penDown(e);
    else if (e.pointerType !== 'touch') return;
    else if (this.fingerDraw && !this.stroke && !this.erasing && !this.gestures.active) this.penDown(e, true);
    else if (this.stroke?.finger) {
      // A second finger: the first one was starting a two-finger scroll, not writing. Drop the
      // stroke and hand both fingers to the scroll (finger-drawing mode only).
      const s = this.stroke;
      this.stroke = null;
      this.gestures.down(s.pointerId, ...this.local({ clientX: s.last[0], clientY: s.last[1] }), e.timeStamp);
      this.gestures.down(e.pointerId, ...this.local(e), e.timeStamp);
      this.invalidate();
    } else this.gestures.down(e.pointerId, ...this.local(e), e.timeStamp, Math.max(e.width || 0, e.height || 0));
  }

  private onMove(e: PointerEvent) {
    // Compare the parent event's id only: Safari 18.2 coalesced events carry wrong ids (TDD 15).
    if (this.erasing && e.pointerId === this.erasing.pointerId) {
      for (const c of coalesced(e)) this.eraseAt(this.toDoc(c.clientX, c.clientY));
    } else if (this.stroke && e.pointerId === this.stroke.pointerId) this.extend(e);
    else if (e.pointerType === 'touch') this.gestures.move(e.pointerId, ...this.local(e), e.timeStamp);
    else if (e.pointerType === 'pen' && !this.stroke && !this.erasing && e.buttons === 0) {
      this.hover = this.toDoc(e.clientX, e.clientY); // PEN-8: a ghost nib before contact
      this.invalidate();
    }
  }

  /** The pointer that is writing or erasing right now, whatever its type. */
  private owns(e: PointerEvent) {
    return e.pointerId === (this.stroke ?? this.erasing)?.pointerId;
  }

  private extend(e: PointerEvent) {
    const s = this.stroke!;
    const pts = coalesced(e).map((c) => this.sample(c, s.finger));
    appendSamples(s.pts, pts);
    s.last = [e.clientX, e.clientY];
    s.pred = s.finger ? [] : predicted(e, s.pts[s.pts.length - 1]![5], this.toDoc);
    this.invalidate();
  }

  /** Touch reports no real pressure, so finger ink uses a steady medium pressure. */
  private sample(e: PointerEvent, finger: boolean, down = false): Pt {
    const pt = toPt(e, this.toDoc, down);
    if (finger) pt[2] = 0.5;
    return pt;
  }

  private onUp(e: PointerEvent) {
    if (this.owns(e)) this.penUp(e);
    else if (e.pointerType === 'touch' && e.type !== 'lostpointercapture') this.gestures.up(e.pointerId, e.timeStamp);
  }

  private penDown(e: PointerEvent, finger = false) {
    this.hover = null;
    if (!finger) this.gestures.penStart(); // the Pencil cancels any pan; a drawing finger is the pan
    try { this.host.setPointerCapture(e.pointerId); } catch { /* synthetic or already-released pointers */ }
    if (this.mode === 'eraser') {
      this.erasing = { pointerId: e.pointerId, ids: new Set(), at: this.toDoc(e.clientX, e.clientY) };
      this.eraseAt(this.erasing.at);
      return;
    }
    this.stroke = { pointerId: e.pointerId, pts: [this.sample(e, finger, true)], pred: [], finger, last: [e.clientX, e.clientY] };
    inkMetrics.penDown(e.timeStamp);
    this.invalidate();
  }

  /** pointerup, pointercancel and lost capture all end the stroke, and all keep it (TDD 4.5). */
  private penUp(e: PointerEvent) {
    const er = this.erasing;
    if (er && e.pointerId === er.pointerId) {
      this.erasing = null;
      this.doc.erase([...er.ids]); // one erase op per gesture (per page touched)
      if (e.pointerType === 'pen') this.gestures.penEnd(e.timeStamp);
      this.invalidate(true);
      return;
    }
    const s = this.stroke;
    if (!s || e.pointerId !== s.pointerId) return;
    // The pointerup sample is the lift-off (~4 px jump, pressure 0): never recorded (D-036).
    this.stroke = null;
    this.doc.addStroke(s.pts, this.preset.tool, this.preset.color, this.preset.size);
    if (!s.finger) this.gestures.penEnd(e.timeStamp); // palm guard after the Pencil, not after a finger
    inkMetrics.penUp();
    this.invalidate();
  }

  undo() {
    if (this.stroke || this.erasing) return; // never mid-stroke
    this.doc.undo();
  }
  redo() {
    if (this.stroke || this.erasing) return;
    this.doc.redo();
  }

  /** ⌘Z / ⇧⌘Z with a hardware keyboard (PRD 10.2); never while typing in a field. */
  private onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t?.closest('input, textarea, select, [contenteditable]')) return;
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === 'z') {
      e.preventDefault();
      if (e.shiftKey) this.redo();
      else this.undo();
    } else if (key === 'y' && e.ctrlKey) {
      e.preventDefault();
      this.redo();
    }
  }

  /** Strokes under the eraser disappear at once; the erase op is written at pen-up. */
  private eraseAt(at: [number, number]) {
    const er = this.erasing!;
    er.at = at;
    for (const op of this.doc.hitTest(at[0], at[1], ERASER_RADIUS / Math.min(1, this.view.zoom), hits)) {
      if (er.ids.has(op.id)) continue;
      er.ids.add(op.id);
      for (const t of [...this.tiles.overlapping(this.doc.docBox(op))]) this.tiles.remove(t);
    }
    this.invalidate(true);
  }

  /** Trackpads and mice scroll. No zoom (D-042); a trackpad pinch is swallowed, not passed to Safari. */
  private onWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) return;
    this.view.panBy(-e.deltaX, -e.deltaY);
    this.invalidate(true);
  }

  /** The document changed in `box`: paint an added stroke into cached tiles, or drop them. */
  private reportHistory() {
    history.set({ canUndo: this.doc.canUndo, canRedo: this.doc.canRedo });
  }

  private changed(box: Box, added?: StrokeOp) {
    this.view.docHeight = this.doc.height;
    this.reportHistory();
    const res = this.res;
    for (const t of [...this.tiles.overlapping(box)]) {
      if (added && t.res === res) this.paintStroke(this.tiles.context(t), added);
      else this.tiles.remove(t);
    }
    this.invalidate(true);
  }

  private get res() {
    return tileRes(this.view.scale * this.dpr);
  }

  invalidate(committed = false) {
    this.composite ||= committed;
    if (!this.frameId) this.frameId = requestAnimationFrame(() => this.frame());
  }

  private frame() {
    this.frameId = 0;
    if (this.composite) { this.drawCommitted(); this.placeTitle(); }
    this.composite = false;
    this.drawLive();
    const d = this.host.dataset; // readable state for tests and /diagnostics
    const v = this.view;
    const state = { scrollY: v.sy.toFixed(1), zoom: v.zoom.toFixed(3), pages: String(this.doc.pages.length), strokes: String(this.doc.strokeCount) };
    for (const [k, val] of Object.entries(state)) if (d[k] !== val) d[k] = val;
  }

  /** Keep page 1's title field on its band of paper as the page scrolls (CSSOM, so CSP-safe). */
  private placeTitle() {
    const el = this.titleEl;
    if (!el) return;
    const s = this.view.scale;
    const [x, y] = this.view.toScreen(SIDE, TITLE.top);
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.width = `${(PAGE_WIDTH - 2 * SIDE) * s}px`;
    el.style.height = `${TITLE.height * s}px`;
    el.style.fontSize = `${TITLE.font * s}px`;
  }

  /** The tiles covering the visible part of the document, painted on first use. */
  private visibleTiles(): Tile[] {
    const { sx, sy } = this.view;
    const res = this.res;
    const u = tileUnits(res);
    const [x1, y1] = this.view.toDoc(this.view.width, this.view.height);
    const c0 = Math.max(0, Math.floor(sx / u)), c1 = Math.min(Math.ceil(PAGE_WIDTH / u) - 1, Math.floor(x1 / u));
    const r0 = Math.max(0, Math.floor(sy / u)), r1 = Math.floor(Math.min(y1, this.doc.height) / u);
    const out: Tile[] = [];
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) out.push(this.tiles.get(c, r, res, (tile, tctx) => this.paintTile(tile, tctx)));
    return out;
  }

  /** Blit visible tiles at whole device pixels, so tile edges never show seams. */
  private drawCommitted() {
    const ctx = this.committed.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.committed.width, this.committed.height);
    ctx.imageSmoothingQuality = 'high';
    const { sx, sy, scale } = this.view;
    const k = scale * this.dpr;
    for (const t of this.visibleTiles()) {
      const [x0, y0, x1, y1] = tileBox(t.col, t.row, t.res);
      const dx = Math.round((x0 - sx) * k), dy = Math.round((y0 - sy) * k);
      ctx.drawImage(t.canvas, dx, dy, Math.round((x1 - sx) * k) - dx, Math.round((y1 - sy) * k) - dy);
    }
  }

  private paintTile(t: Tile, ctx: Ctx2D) {
    const box = tileBox(t.col, t.row, t.res);
    const colors = { paper: resolveToken('--paper'), rule: resolveToken('--rule'), ink: resolveToken('--ink'), inkSoft: resolveToken('--ink-soft') };
    for (const page of this.doc.pages) {
      const top = this.doc.pageTop(page);
      if (overlaps(box, [0, top, PAGE_WIDTH, top + A5_HEIGHT])) drawPaper(ctx, page.paper, top, colors, { date: this.dateLabel, page: page.index + 1 });
    }
    const erasing = this.erasing?.ids;
    for (const op of this.doc.strokes()) if (!erasing?.has(op.id) && overlaps(box, this.doc.docBox(op))) this.paintStroke(ctx, op);
  }

  private paintStroke(ctx: Ctx2D, op: StrokeOp) {
    const top = this.doc.pageTop(this.doc.page(op.pageId));
    ctx.save();
    ctx.translate(0, top);
    ctx.fillStyle = inkColor(op.color);
    ctx.fill(this.pathOf(op));
    ctx.restore();
  }

  /** Outlines are pure (D-036), so each committed stroke is built once and reused by every tile. */
  private paths = new WeakMap<StrokeOp, Path2D>();
  private pathOf(op: StrokeOp): Path2D {
    let p = this.paths.get(op);
    if (!p) this.paths.set(op, (p = strokePath(op.pts, op.tool, op.size, this.smoothing, true)));
    return p;
  }

  private drawLive() {
    const ctx = this.live.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.live.width, this.live.height);
    const { scale, sx, sy } = this.view;
    const k = scale * this.dpr;
    ctx.setTransform(k, 0, 0, k, -sx * k, -sy * k);
    const ring = this.erasing?.at ?? (this.mode === 'eraser' ? this.hover : null);
    if (ring) {
      // The eraser's reach, as a quiet ring under the nib (while erasing, or hovering to erase).
      ctx.strokeStyle = resolveToken('--ink-soft');
      ctx.lineWidth = 1.5 / scale;
      ctx.beginPath();
      ctx.arc(ring[0], ring[1], ERASER_RADIUS / Math.min(1, this.view.zoom), 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.hover) {
      // PEN-8: a ghost of the nib in the preset's ink and size, before it touches the glass:
      // the fountain pen's slanted italic edge, or the ballpoint's round tip.
      const [x, y] = this.hover;
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = ctx.strokeStyle = inkColor(this.preset.color);
      ctx.beginPath();
      if (this.preset.tool === 'fountain') {
        const h = this.preset.size * 0.44, dx = Math.cos(NIB_ANGLE) * h, dy = -Math.sin(NIB_ANGLE) * h;
        ctx.lineWidth = Math.max(1, this.preset.size * 0.25);
        ctx.lineCap = 'round';
        ctx.moveTo(x - dx, y - dy);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();
      } else {
        ctx.arc(x, y, Math.max(1.5, this.preset.size * 0.55), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const s = this.stroke;
    if (!s) return;
    ctx.fillStyle = inkColor(this.preset.color);
    const { tool, size } = this.preset;
    ctx.fill(strokePath(s.pred.length ? s.pts.concat(s.pred) : s.pts, tool, size, this.smoothing, false));
    inkMetrics.drawn();
  }

  protected listen(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions) {
    target.addEventListener(type, fn, opts);
    this.off.push(() => target.removeEventListener(type, fn, opts));
  }

  destroy() {
    this.ro.disconnect();
    this.gestures.stopInertia();
    cancelAnimationFrame(this.frameId);
    this.tiles.drop();
    for (const f of this.off) f();
  }
}

// Wires the writing surface together: sizing, iOS suppression, input, gestures, rendering.
// Grows step by step through M2; everything here is plain TS and testable through the DOM.

export class InkEngine {
  private ro: ResizeObserver;
  private off: (() => void)[] = [];
  /** CSS-pixel box of the surface and its device pixel ratio (D-037). */
  box = { x: 0, y: 0, width: 0, height: 0, dpr: 1 };

  constructor(
    private host: HTMLElement,
    private committed: HTMLCanvasElement,
    private live: HTMLCanvasElement,
  ) {
    this.listen(host, 'touchstart', prevent, { passive: false });
    this.listen(host, 'touchmove', prevent, { passive: false });
    this.listen(host, 'gesturestart', prevent, { passive: false }); // Safari's own pinch-zoom
    this.listen(host, 'contextmenu', prevent); // long-press callout
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
  }

  /** Backing stores follow the element's own box, never innerWidth/100vh (D-037). */
  resize() {
    const r = this.host.getBoundingClientRect();
    const dpr = devicePixelRatio || 1;
    this.box = { x: r.left, y: r.top, width: r.width, height: r.height, dpr };
    for (const c of [this.committed, this.live]) {
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
    }
  }

  protected listen(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions) {
    target.addEventListener(type, fn, opts);
    this.off.push(() => target.removeEventListener(type, fn, opts));
  }

  destroy() {
    this.ro.disconnect();
    for (const f of this.off) f();
  }
}

const prevent = (e: Event) => e.preventDefault();

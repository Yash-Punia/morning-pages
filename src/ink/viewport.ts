// Page space ↔ screen (TDD 5.1). Pages are PAGE_WIDTH units wide and stack vertically with
// PAGE_GAP between them ("document space"). The page is at most MAX_PAGE_CSS wide on screen, so
// on the reference iPad (DPR 2) one unit is exactly two device pixels at zoom 1 (D-040).
import { PAGE_WIDTH } from './types.ts';

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 4;
export const MAX_PAGE_CSS = 1000;
const END_SPACE = 160; // units of desk below the last page, so its bottom line is reachable

export class Viewport {
  width = 0; // CSS px of the surface
  height = 0;
  zoom = 1;
  sx = 0; // document coordinates at the surface's top-left
  sy = 0;
  docHeight = 0;

  get base() {
    return Math.min(this.width, MAX_PAGE_CSS) / PAGE_WIDTH;
  }
  /** CSS px per page unit. */
  get scale() {
    return this.base * this.zoom || 1;
  }

  toDoc(cx: number, cy: number): [number, number] {
    const s = this.scale;
    return [cx / s + this.sx, cy / s + this.sy];
  }
  toScreen(x: number, y: number): [number, number] {
    const s = this.scale;
    return [(x - this.sx) * s, (y - this.sy) * s];
  }

  resize(width: number, height: number) {
    const [cx] = this.toDoc(this.width / 2, 0);
    this.width = width;
    this.height = height;
    this.sx = cx - width / 2 / this.scale; // keep the horizontal centre and the top line in place
    this.clamp();
  }

  panBy(dx: number, dy: number) {
    const s = this.scale;
    this.sx -= dx / s;
    this.sy -= dy / s;
    this.clamp();
  }

  /** Zoom to `zoom`, keeping the document point under (cx, cy) fixed. */
  zoomAt(zoom: number, cx: number, cy: number) {
    const [x, y] = this.toDoc(cx, cy);
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    const s = this.scale;
    this.sx = x - cx / s;
    this.sy = y - cy / s;
    this.clamp();
  }

  /** Centre the page when it is narrower than the surface; never scroll past the content. */
  clamp() {
    const s = this.scale;
    const viewW = this.width / s;
    const viewH = this.height / s;
    this.sx = viewW >= PAGE_WIDTH ? (PAGE_WIDTH - viewW) / 2 : Math.min(Math.max(this.sx, 0), PAGE_WIDTH - viewW);
    this.sy = Math.min(Math.max(this.sy, 0), Math.max(0, this.docHeight + END_SPACE - viewH));
  }
}

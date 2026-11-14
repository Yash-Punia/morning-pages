// Committed ink as tiles (TDD 5.5, INK-5). Every tile is a TILE_PX × TILE_PX bitmap at a
// power-of-two resolution at or above the screen's device scale, so tiles are only ever
// downsampled (crisp). A tile covers TILE_PX / res page units: 512 units at the reference iPad's
// 2 px per unit, fewer when zoomed in. Tiles therefore cost the same memory at every zoom, and
// Safari's global canvas limit is never crossed (D-040). Panning re-blits tiles; a finished stroke
// paints into the tiles it touches; full redraws happen only on zoom-bucket changes, undo, erase
// and theme changes.
import type { Box } from './types.ts';

export const TILE_PX = 1024;
/** Page units a tile covers at the reference resolution (2 px/unit), as in TDD 5.5. */
export const TILE = 512;
export const tileUnits = (res: number) => TILE_PX / res;
/** 24 tiles of 1024² RGBA: ≈ 100 MB (TDD 5.5). */
export const PIXEL_BUDGET = 24 * TILE_PX * TILE_PX;

export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface Tile { key: string; col: number; row: number; res: number; canvas: AnyCanvas; pixels: number }

/** Tile resolution (device px per unit): the next power of two at or above the device scale. */
export const tileRes = (deviceScale: number) => 2 ** Math.min(3, Math.max(-2, Math.ceil(Math.log2(deviceScale) - 1e-9)));

export const tileBox = (col: number, row: number, res: number): Box => {
  const u = tileUnits(res);
  return [col * u, row * u, (col + 1) * u, (row + 1) * u];
};
export const overlaps = (a: Box, b: Box) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

const makeCanvas = (w: number, h: number): AnyCanvas =>
  typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });

/** Least-recently-used tiles under a pixel budget. Evicted tiles release memory at once. */
export class TileCache {
  private tiles = new Map<string, Tile>(); // insertion order = recency
  private pixels = 0;

  constructor(private budget = PIXEL_BUDGET, private make = makeCanvas) {}

  get size() { return this.tiles.size; }
  get usedPixels() { return this.pixels; }

  /** The tile at (col, row, res), drawn by `paint` when it isn't cached. */
  get(col: number, row: number, res: number, paint: (t: Tile, ctx: Ctx2D) => void): Tile {
    const key = `${col}:${row}@${res}`;
    let t = this.tiles.get(key);
    if (t) {
      this.tiles.delete(key);
      this.tiles.set(key, t);
      return t;
    }
    t = { key, col, row, res, canvas: this.make(TILE_PX, TILE_PX), pixels: TILE_PX * TILE_PX };
    this.tiles.set(key, t);
    this.pixels += t.pixels;
    paint(t, this.context(t));
    this.evict(key);
    return t;
  }

  context(t: Tile): Ctx2D {
    const ctx = t.canvas.getContext('2d') as Ctx2D;
    ctx.setTransform(t.res, 0, 0, t.res, -t.col * TILE_PX, -t.row * TILE_PX);
    return ctx;
  }

  /** Every cached tile overlapping `box` (any resolution). */
  *overlapping(box: Box): Iterable<Tile> {
    for (const t of this.tiles.values()) if (overlaps(tileBox(t.col, t.row, t.res), box)) yield t;
  }

  drop(box?: Box) {
    for (const t of [...this.tiles.values()]) if (!box || overlaps(tileBox(t.col, t.row, t.res), box)) this.remove(t);
  }

  /** Drop one tile. */
  remove(t: Tile) {
    if (!this.tiles.delete(t.key)) return;
    this.pixels -= t.pixels;
    t.canvas.width = t.canvas.height = 0; // release the bitmap now, not at GC (Safari's limit)
  }

  private evict(keep: string) {
    for (const t of this.tiles.values()) {
      if (this.pixels <= this.budget) break;
      if (t.key !== keep) this.remove(t);
    }
  }
}

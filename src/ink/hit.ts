// Stroke hit-testing for the eraser (TDD 5.6): a bounding-box prefilter, then the stroke's
// outline polygon: inside it, or within the eraser's radius of its edge.
import { outline } from './stroke.ts';
import type { StrokeOp } from './types.ts';

const polygons = new WeakMap<StrokeOp, number[][]>();
const polygonOf = (op: StrokeOp) => {
  let p = polygons.get(op);
  if (!p) polygons.set(op, (p = outline(op.pts, op.tool, op.size, 'medium', true)));
  return p;
};

/** Does a circle at page-local (x, y) with radius r touch the stroke? */
export function hits(op: StrokeOp, x: number, y: number, r: number): boolean {
  const [x0, y0, x1, y1] = op.bbox;
  if (x < x0 - r || x > x1 + r || y < y0 - r || y > y1 + r) return false;
  const poly = polygonOf(op);
  if (poly.length < 3) return op.pts.some(([px, py]) => Math.hypot(px - x, py - y) <= r + op.size / 2);
  return inside(poly, x, y) || nearEdge(poly, x, y, r);
}

function inside(poly: number[][], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i] as [number, number], [xj, yj] = poly[j] as [number, number];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function nearEdge(poly: number[][], x: number, y: number, r: number): boolean {
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j] as [number, number], [bx, by] = poly[i] as [number, number];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    if (Math.hypot(ax + t * dx - x, ay + t * dy - y) <= r) return true;
  }
  return false;
}

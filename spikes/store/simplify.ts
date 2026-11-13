import type { Pt } from './codec.ts';

/**
 * Ramer–Douglas–Peucker with a pressure guard (TDD §5.4). A point is kept if it
 * is further than `eps` page units from the chord, or its pressure differs from
 * the chord's interpolated pressure by more than `pGuard`. eps = 0 keeps all.
 */
export function simplify(pts: Pt[], eps: number, pGuard = 0.03): Pt[] {
  if (eps <= 0 || pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay, ap] = pts[a];
    const [bx, by, bp] = pts[b];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let worst = -1, worstScore = 1;
    for (let i = a + 1; i < b; i++) {
      const [x, y, p] = pts[i];
      const u = len2 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
      const dist = Math.hypot(x - (ax + u * dx), y - (ay + u * dy));
      const score = Math.max(dist / eps, Math.abs(p - (ap + u * (bp - ap))) / pGuard);
      if (score > worstScore) { worstScore = score; worst = i; }
    }
    if (worst > 0) { keep[worst] = 1; stack.push([a, worst], [worst, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

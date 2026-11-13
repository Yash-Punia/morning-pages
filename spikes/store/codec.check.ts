// Runnable self-check: node store/codec.check.ts
import assert from 'node:assert/strict';
import { encode, decode, type Pt } from './codec.ts';
import { simplify } from './simplify.ts';

let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

for (let s = 0; s < 200; s++) {
  const pts: Pt[] = [];
  let x = rnd() * 1000, y = rnd() * 1400, t = 1e6 + rnd() * 1e6;
  for (let i = 0; i < 50 + Math.floor(rnd() * 400); i++) {
    x += (rnd() - 0.5) * 30; y += (rnd() - 0.5) * 30; t += rnd() * 9;
    pts.push([x, y, rnd(), rnd() * Math.PI / 2, rnd() * Math.PI * 2, t]);
  }
  const out = decode(encode(pts));
  assert.equal(out.length, pts.length);
  pts.forEach((p, i) => {
    const q = out[i];
    assert.ok(Math.abs(p[0] - q[0]) <= 1 / 32 + 1e-9, 'x within half a quantum');
    assert.ok(Math.abs(p[1] - q[1]) <= 1 / 32 + 1e-9, 'y within half a quantum');
    assert.ok(Math.abs(p[2] - q[2]) <= 1 / 510 + 1e-9, 'pressure');
    assert.ok(Math.abs(p[3] - q[3]) <= Math.PI / 2 / 126 + 1e-9, 'altitude');
    const daz = Math.abs(p[4] - q[4]) % (Math.PI * 2);
    assert.ok(Math.min(daz, Math.PI * 2 - daz) <= Math.PI / 256 + 1e-9, 'azimuth (wraps)');
    assert.ok(Math.abs(p[5] - q[5]) <= 1 + 1e-9, 'time within 1 ms, no drift');
  });
}

// Pressure/tilt flags off: decoder fills defaults.
const flat = decode(encode([[0, 0, 0.9, 0.2, 1, 0], [1, 1, 0.1, 0.3, 2, 5]], { pressure: false, tilt: false }));
assert.deepEqual(flat.map((p) => p[2]), [0.5, 0.5]);

// Simplify keeps endpoints, drops collinear points, keeps a pressure spike.
const line: Pt[] = Array.from({ length: 11 }, (_, i) => [i, 0, i === 5 ? 0.9 : 0.5, 1, 0, i]);
const kept = simplify(line, 0.15);
assert.deepEqual(kept.map((p) => p[0]), [0, 4, 5, 6, 10]);
assert.equal(simplify(line, 0).length, 11);

console.log('codec + simplify checks passed');

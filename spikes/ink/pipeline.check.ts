// node ink/pipeline.check.ts [page.json ...]
// Asserts the pipeline on a synthetic quantised stroke, then prints metrics for recorded pages.
import { readFileSync } from 'node:fs';
import { smooth, SMOOTHING, type Pt } from './pipeline.ts';

const d2 = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** RMS of the second difference: how much the path wiggles point to point. */
const jitter = (p: Pt[]) => {
  let s = 0;
  for (let i = 2; i < p.length; i++) s += (p[i][0] - 2 * p[i - 1][0] + p[i - 2][0]) ** 2 + (p[i][1] - 2 * p[i - 1][1] + p[i - 2][1]) ** 2;
  return Math.sqrt(s / Math.max(1, p.length - 2));
};
const lag = (raw: Pt[], sm: Pt[]) => raw.reduce((a, r, i) => a + d2(r, sm[i]), 0) / raw.length;
/** End hook: the last ~2 px of path turns > 45° from the direction just before it. */
const hooked = (p: Pt[]) => {
  const n = p.length - 1;
  let i = n; while (i > 0 && d2(p[n], p[i]) < 2) i--;
  let j = i; while (j > 0 && d2(p[i], p[j]) < 2) j--;
  if (j === i || i === n) return false;
  const a = [p[i][0] - p[j][0], p[i][1] - p[j][1]], b = [p[n][0] - p[i][0], p[n][1] - p[i][1]];
  return (a[0] * b[0] + a[1] * b[1]) / Math.hypot(...a) / Math.hypot(...b) < Math.SQRT1_2;
};

// Synthetic: slow diagonal at 150 px/s, 240 Hz, snapped to 0.5 px like the iPad reports.
const q = (v: number) => Math.round(v * 2) / 2;
const line: Pt[] = Array.from({ length: 240 }, (_, i) => [q(100 + i * 0.44 + Math.sin(i) * 0.2), q(100 + i * 0.44), 0.5, 1, 0, i * 4.17]);
for (const [name, cfg] of Object.entries(SMOOTHING)) {
  const sm = smooth(line, cfg, true);
  const j0 = jitter(line), j1 = jitter(sm.slice(0, line.length));
  console.assert(j1 < j0 * 0.5, `${name}: jitter ${j1} not < half of ${j0}`);
  console.assert(d2(sm[sm.length - 1], line[line.length - 1]) < 0.5, `${name}: end did not settle on the last sample`);
  console.assert(smooth(line, cfg, false).length === line.length, `${name}: live output length`);
}
console.log('synthetic checks done');

for (const file of process.argv.slice(2)) {
  const page = JSON.parse(readFileSync(file, 'utf8')) as { strokes: { pts: Pt[] }[] };
  // Recorded pages still contain the lift-off sample (pressure 0, last); the new page drops it.
  const asRecorded = page.strokes.map((s) => s.pts).filter((p) => p.length > 10);
  const strokes = asRecorded.map((p) => (p[p.length - 1][2] === 0 ? p.slice(0, -1) : p));
  const pctHooked = (ps: Pt[][]) => `${((ps.filter(hooked).length / ps.length) * 100).toFixed(0)}% end hooks`;
  const rows: Record<string, string> = {};
  rows['before (raw + lift-off)'] = `jitter ${(asRecorded.reduce((a, p) => a + jitter(p), 0) / asRecorded.length).toFixed(3)} px · ${pctHooked(asRecorded)}`;
  for (const [name, cfg] of Object.entries(SMOOTHING)) {
    let j = 0, l = 0, end = 0;
    const fins = strokes.map((p) => smooth(p, cfg, true));
    strokes.forEach((p, k) => {
      const live = smooth(p, cfg, false), fin = fins[k];
      j += jitter(live); l += lag(p, live); end = Math.max(end, d2(fin[fin.length - 1], p[p.length - 1]));
    });
    rows[name] = `jitter ${(j / strokes.length).toFixed(3)} px · lag ${(l / strokes.length).toFixed(2)} px · end gap ≤ ${end.toFixed(2)} px · ${pctHooked(fins)}`;
  }
  console.log(file.split(/[\\/]/).pop(), `(${strokes.length} strokes)`);
  console.table(rows);
}

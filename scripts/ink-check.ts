// npm run ink:check [page.json …]
// Replays the owner's real Pencil pages (spikes/samples/, gitignored and never committed) through
// the production stroke pipeline and checks the D-036 thresholds. Local only: CI has no samples.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { appendSamples } from '../src/ink/input.ts';
import { smooth, SMOOTHING } from '../src/ink/stroke.ts';
import type { Pt } from '../src/ink/types.ts';
import { endGapMax, hookShare, jitter, lag } from './ink-metrics.ts';

const DIR = 'spikes/samples';
const files = process.argv.slice(2).length ? process.argv.slice(2) : existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => join(DIR, f)) : [];
if (!files.length) {
  console.log(`No sample pages in ${DIR}; nothing to check (they are private and stay local).`);
  process.exit(0);
}

let failed = false;
for (const file of files) {
  const page = JSON.parse(readFileSync(file, 'utf8')) as { strokes: { pts: Pt[] }[] };
  // Replay each recorded stroke through the app's input path: dedupe repeated coalesced samples,
  // and drop the lift-off sample (pressure 0, last), which the app never records.
  const strokes = page.strokes
    .map((s) => {
      const pts: Pt[] = [];
      appendSamples(pts, s.pts.at(-1)?.[2] === 0 ? s.pts.slice(0, -1) : s.pts);
      return pts;
    })
    .filter((p) => p.length > 10);
  const cfg = SMOOTHING.medium;
  const finals = strokes.map((p) => smooth(p, cfg, true));
  const lives = strokes.map((p) => smooth(p, cfg, false));
  const j = lives.reduce((a, p) => a + jitter(p), 0) / strokes.length;
  const l = strokes.reduce((a, p, i) => a + lag(p, lives[i]!), 0) / strokes.length;
  const hooks = hookShare(finals);
  const gap = endGapMax(strokes, finals);
  // A page with backwards timestamps was recorded by the pre-D-036 input (S1 round 1: stretched
  // canvas, repeated samples); its strokes are not what today's input records, so it is reported
  // but not gated.
  const legacy = page.strokes.some((s) => s.pts.some((p, i) => i > 0 && p[5] < s.pts[i - 1]![5]));
  const ok = j <= 0.3 && hooks <= 0.1; // D-036 thresholds (Milestones 2.4)
  if (!legacy) failed ||= !ok;
  console.log(`${legacy ? '·' : ok ? '✓' : '✗'} ${file}${legacy ? ' (recorded before the D-036 input fix: reported, not gated)' : ''}`);
  console.log(`  ${strokes.length} strokes · jitter ${j.toFixed(3)} px · lag ${l.toFixed(2)} px · end gap ≤ ${gap.toFixed(2)} px · ${(hooks * 100).toFixed(0)}% end hooks`);
}
process.exit(failed ? 1 : 0);

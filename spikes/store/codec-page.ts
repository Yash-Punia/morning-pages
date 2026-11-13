// S2b · measure the TDD §7.3 codec + RDP on real pages exported from S1.
import { encode, decode, type Pt } from './codec.ts';
import { simplify } from './simplify.ts';
import { hud, set } from '../shared/hud.ts';
import './store.css';
import './codec.css';

interface Sample { name: string; width: number; strokes: { pts: Pt[] }[] }
const EPS = [0, 0.1, 0.15, 0.25]; // page units (page width = 1000)
const BUDGET_KB = 150;
const samples: Sample[] = [];
let shownEps = 0.15;

/** S1 exports CSS-px coordinates; convert to page units (width = 1000). */
function toPage(raw: { width: number; strokes: { pts: Pt[] }[] }, name: string): Sample {
  const k = 1000 / raw.width;
  return { name, width: raw.width, strokes: raw.strokes.map((s) => ({ pts: s.pts.map(([x, y, p, a, z, t]) => [x * k, y * k, p, a, z, t] as Pt) })) };
}

function measure(s: Sample, eps: number) {
  let bytes = 0, rawPts = 0, keptPts = 0, maxPos = 0, maxP = 0;
  for (const { pts } of s.strokes) {
    if (!pts.length) continue;
    const kept = simplify(pts, eps);
    const buf = encode(kept);
    const back = decode(buf);
    bytes += buf.length;
    rawPts += pts.length;
    keptPts += kept.length;
    kept.forEach((p, i) => {
      maxPos = Math.max(maxPos, Math.hypot(p[0] - back[i][0], p[1] - back[i][1]));
      maxP = Math.max(maxP, Math.abs(p[2] - back[i][2]));
    });
  }
  return { kb: bytes / 1024, rawPts, keptPts, perPt: bytes / Math.max(1, rawPts), maxPos, maxP };
}

function render() {
  const table = document.getElementById('table')!;
  const rows = [['Sample', 'ε', 'Points kept', 'KB / page', 'B / raw point', 'Max quant. error (units)', 'Max pressure error', 'Budget']];
  for (const s of samples)
    for (const eps of EPS) {
      const m = measure(s, eps);
      rows.push([s.name, String(eps), `${m.keptPts} / ${m.rawPts}`, m.kb.toFixed(1), m.perPt.toFixed(2),
        m.maxPos.toFixed(4), m.maxP.toFixed(4), m.kb < BUDGET_KB ? 'ok' : 'OVER']);
      set(`${s.name} @ε${eps}`, `${m.kb.toFixed(1)} KB, ${m.keptPts}/${m.rawPts} pts`);
    }
  table.replaceChildren(...rows.map((r, i) => {
    const tr = document.createElement('tr');
    tr.append(...r.map((c) => { const td = document.createElement(i ? 'td' : 'th'); td.textContent = c; return td; }));
    return tr;
  }));
  const epsBar = document.getElementById('eps')!;
  epsBar.replaceChildren('Overlay (grey = raw, ink = decoded): ', ...EPS.map((e) => {
    const b = document.createElement('button');
    b.textContent = `ε ${e}`;
    b.disabled = e === shownEps;
    b.addEventListener('click', () => { shownEps = e; render(); });
    return b;
  }));
  draw();
}

/** Overlay the first sample: raw polyline in grey, decoded points in ink. */
function draw() {
  const s = samples[0];
  const c = document.getElementById('view') as HTMLCanvasElement;
  if (!s) return;
  const w = Math.min(960, innerWidth - 40), scale = w / 1000, dpr = devicePixelRatio;
  const maxY = Math.max(...s.strokes.flatMap((st) => st.pts.map((p) => p[1])), 100);
  c.width = w * dpr; c.height = (maxY + 20) * scale * dpr;
  c.style.width = `${w}px`; c.style.height = `${(maxY + 20) * scale}px`;
  const ctx = c.getContext('2d')!;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  ctx.lineWidth = 1.5 / scale;
  const line = (pts: Pt[], color: string) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  };
  for (const { pts } of s.strokes) {
    if (!pts.length) continue;
    line(pts, 'rgb(200 120 100 / 0.6)');
    line(decode(encode(simplify(pts, shownEps))), '#1e2a3a');
  }
}

async function add(name: string, text: string) {
  try { samples.push(toPage(JSON.parse(text), name)); render(); } catch (e) { set(`load ${name}`, String(e)); }
}

document.getElementById('files')!.addEventListener('change', async (e) => {
  for (const f of (e.target as HTMLInputElement).files ?? []) await add(f.name, await f.text());
});

hud('codec');
// Dev server only: auto-load local samples (never deployed or committed).
fetch('/__samples').then((r) => (r.ok ? r.json() : [])).then(async (names: string[]) => {
  for (const n of names) await add(n, await (await fetch(`/samples/${n}`)).text());
}).catch(() => {});

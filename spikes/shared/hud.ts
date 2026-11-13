// Tiny on-device HUD for spikes. The dev machine is Windows, so there is no
// Safari Web Inspector: everything we need to read comes from this overlay.
// Rule: never touch the DOM while busy (e.g. a pen stroke is down), so the HUD
// can't pollute the frame timings it reports.
import './hud.css';

type Value = string | number | boolean;

const metrics = new Map<string, Value>();
const log: string[] = [];
let spike = 'misc';
let busy = false;
let dirty = false;
let box: HTMLPreElement;
let controls: HTMLDivElement;

export function hud(name: string) {
  spike = name;
  const root = document.createElement('div');
  root.className = 'hud';
  controls = document.createElement('div');
  controls.className = 'hud-controls';
  box = document.createElement('pre');
  root.append(controls, box);
  document.body.append(root);
  button('Save results', saveResults);
  button('Hide', () => root.classList.toggle('hud-min'));
  setInterval(render, 300);
}

export function set(key: string, value: Value) {
  metrics.set(key, typeof value === 'number' ? Math.round(value * 100) / 100 : value);
  dirty = true;
}

export function note(msg: string) {
  log.push(`${(performance.now() / 1000).toFixed(1)}s ${msg}`);
  if (log.length > 200) log.shift();
  dirty = true;
}

/** While busy, the HUD stops repainting. Call setBusy(false) on pen-up. */
export function setBusy(b: boolean) {
  busy = b;
  if (!b) render();
}

export function button(label: string, onClick: () => void) {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  controls.append(b);
  return b;
}

export function toggle(label: string, initial: boolean, onChange: (v: boolean) => void) {
  let v = initial;
  const b = button('', () => {
    v = !v;
    paint();
    onChange(v);
  });
  const paint = () => (b.textContent = `${label}: ${v ? 'on' : 'off'}`);
  paint();
  return b;
}

export function results() {
  return {
    spike,
    at: new Date().toISOString(),
    userAgent: navigator.userAgent,
    dpr: devicePixelRatio,
    viewport: `${innerWidth}x${innerHeight}`,
    standalone: matchMedia('(display-mode: standalone)').matches,
    metrics: Object.fromEntries(metrics),
    log,
  };
}

/** Dev server writes to the repo; otherwise fall back to share sheet, then clipboard. */
export async function saveJson(endpoint: string, data: unknown, filename: string) {
  const body = JSON.stringify(data);
  try {
    const r = await fetch(endpoint, { method: 'POST', body });
    if (r.ok) return note(`saved ${(await r.json()).saved}`);
  } catch {}
  const file = new File([body], filename, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file] });
  } catch {}
  await navigator.clipboard?.writeText(body).then(() => note('copied to clipboard'), () => note('save failed'));
}

function saveResults() {
  saveJson(`/__results?spike=${spike}`, results(), `${spike}-results.json`);
}

function render() {
  if (busy || !dirty || !box) return;
  dirty = false;
  const lines = [...metrics].map(([k, v]) => `${k}: ${v}`);
  box.textContent = [...lines, '', ...log.slice(-8)].join('\n');
}

// CSS colour tokens resolved to values a canvas can paint (tokens are OKLCH light-dark() pairs).
// Resolved through a probe element, then flattened to rgb() through a 1×1 canvas, so canvas never
// depends on the engine's support for oklch() or light-dark().
let probe: HTMLElement | undefined;
let pixel: CanvasRenderingContext2D | undefined;
const cache = new Map<string, string>();

/** The current theme's value of a CSS custom property, as an rgb()/rgba() string. */
export function resolveToken(name: string): string {
  const hit = cache.get(name);
  if (hit) return hit;
  probe ??= Object.assign(document.createElement('span'), { hidden: true });
  if (!probe.isConnected) document.body.append(probe);
  probe.style.color = `var(${name})`;
  const value = toRgb(getComputedStyle(probe).color);
  cache.set(name, value);
  return value;
}

/** Any CSS colour as an rgb() string a canvas can paint. */
export function canvasColor(css: string): string {
  const key = `css:${css}`;
  let v = cache.get(key);
  if (!v) cache.set(key, (v = toRgb(css)));
  return v;
}

function toRgb(css: string): string {
  pixel ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true })!;
  pixel.clearRect(0, 0, 1, 1);
  pixel.fillStyle = css;
  pixel.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = pixel.getImageData(0, 0, 1, 1).data;
  return a === 255 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${(a! / 255).toFixed(3)})`;
}

/** Forget resolved colours (theme changed). Returns an unsubscribe for the theme watcher. */
export function watchTheme(onChange: () => void): () => void {
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const changed = () => { cache.clear(); onChange(); };
  const mo = new MutationObserver(changed);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  mq.addEventListener('change', changed);
  return () => { mo.disconnect(); mq.removeEventListener('change', changed); };
}

// Pathname router (D-004, TDD 4). Today and Entry ship in the main chunk so a cold launch
// loads the canvas and nothing else; every other screen is a lazy chunk.
import { tick, type Component } from 'svelte';
import { writable } from 'svelte/store';
import Today from './screens/Today.svelte';
import Entry from './screens/Entry.svelte';

export type Params = Record<string, string>;
type Screen = Component<{ params: Params }>;
type Load = () => Promise<{ default: Screen }>;

const ROUTES: [template: string, title: string, load: Load][] = [
  ['/today', 'Today', async () => ({ default: Today })],
  ['/entry/:id', 'Entry', async () => ({ default: Entry })],
  ['/library', 'Library', () => import('./screens/Library.svelte')],
  ['/settings', 'Settings', () => import('./screens/Settings.svelte')],
  ['/onboarding', 'Welcome', () => import('./screens/Onboarding.svelte')],
  ['/privacy', 'Privacy', () => import('./screens/Privacy.svelte')],
  ['/diagnostics', 'Diagnostics', () => import('./screens/Diagnostics.svelte')],
];
const HOME = '/today';

/** The route template (`/entry/:id`), never the concrete path: analytics may only see templates. */
export interface Route { template: string; title: string; params: Params; screen: Screen }
export const route = writable<Route | null>(null);

export function match(path: string) {
  for (const [template, title, load] of ROUTES) {
    const keys: string[] = [];
    const re = new RegExp(`^${template.replace(/:(\w+)/g, (_, k: string) => (keys.push(k), '([^/]+)'))}/?$`);
    const m = re.exec(path);
    if (m) return { template, title, load, params: Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1]!)])) };
  }
  return null;
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let rendered = false;

async function render(path: string): Promise<void> {
  const m = match(path);
  if (!m) return navigate(HOME, { replace: true });
  const { default: screen } = await m.load();
  const apply = () => {
    route.set({ template: m.template, title: m.title, params: m.params, screen });
    document.title = m.template === HOME ? 'Morning Pages' : `${m.title} · Morning Pages`;
  };
  if (rendered && document.startViewTransition && !reducedMotion.matches) {
    document.startViewTransition(async () => { apply(); await tick(); });
  } else apply();
  rendered = true;
}

export function navigate(path: string, { replace = false } = {}): Promise<void> {
  if (path !== location.pathname + location.search) history[replace ? 'replaceState' : 'pushState'](null, '', path);
  return render(location.pathname);
}

export function startRouter() {
  addEventListener('popstate', () => render(location.pathname));
  // Same-origin links navigate in place; modified clicks, targets and downloads keep browser behaviour.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest('a');
    if (!a || a.target || a.hasAttribute('download') || a.origin !== location.origin) return;
    e.preventDefault();
    navigate(a.pathname + a.search);
  });
  return location.pathname === '/' ? navigate(HOME, { replace: true }) : render(location.pathname);
}

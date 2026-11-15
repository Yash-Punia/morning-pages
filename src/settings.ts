// Preferences, in localStorage (D-047, TDD 6.5): safe to lose, read synchronously at startup.
// Only non-journal preferences live here; DUR-8 keeps every important record out of localStorage.
import type { SmoothingLevel } from './ink/stroke.ts';
import type { PaperStyle } from './ink/types.ts';

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode: keep default */ } };

/** Anonymous usage counts: on by default, disclosed on the privacy page (TDD 9.4). */
export const analyticsAllowed = () => read('mp.analytics') !== 'off';
export const setAnalyticsAllowed = (on: boolean) => write('mp.analytics', on ? 'on' : 'off');

/** First run is done in this storage container (a Safari tab and the installed app each have their own). */
export const onboarded = {
  get: () => read('mp.onboarded') === '1',
  set: () => write('mp.onboarded', '1'),
};

/** Once-only markers for install_detected and the daily launch_perf event. */
export const once = (key: string, value = '1') => {
  if (read(`mp.once.${key}`) === value) return false;
  write(`mp.once.${key}`, value);
  return true;
};

/** A string preference restricted to known values, with a default. */
function choice<T extends string>(key: string, values: readonly T[], fallback: T) {
  return {
    values,
    get: (): T => { const v = read(key) as T | null; return v && values.includes(v) ? v : fallback; },
    set: (v: T) => write(key, v),
  };
}

/** Ink smoothing (D-036): higher is smoother but trails the pen slightly more. */
export const inkSmoothing = choice<SmoothingLevel>('mp.ink.smoothing', ['low', 'medium', 'high'], 'medium');

/** PEN-7: one finger draws (for people without a Pencil); two fingers scroll. Off by default. */
export const fingerDrawing = {
  get: () => read('mp.ink.finger') === 'on',
  set: (on: boolean) => write('mp.ink.finger', on ? 'on' : 'off'),
};

/**
 * Where each recently open entry was scrolled to (PRD 3, step 7): reopening lands on the same
 * page. A view preference, safe to lose; only the last few entries are kept.
 */
export const scrollPos = {
  get(entryId: string): number {
    try { return (JSON.parse(read('mp.scroll') ?? '{}') as Record<string, number>)[entryId] ?? 0; } catch { return 0; }
  },
  set(entryId: string, y: number) {
    let all: Record<string, number> = {};
    try { all = JSON.parse(read('mp.scroll') ?? '{}'); } catch { /* start over */ }
    delete all[entryId];
    all[entryId] = Math.round(y); // most recent last
    write('mp.scroll', JSON.stringify(Object.fromEntries(Object.entries(all).slice(-10))));
  },
};

/** Theme (owner decision, M4): follow the iPad (Paper by day, Night in dark mode), or pin one. */
export type Theme = 'system' | 'paper' | 'night';
export const theme = choice<Theme>('mp.theme', ['system', 'paper', 'night'], 'system');
/** themes.css reads data-theme on <html>; without it the system decides. */
export function applyTheme(t: Theme = theme.get()) {
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

/** BAK-2: a quiet Library note once the last backup is older than this many days. */
export const backupDays = choice('mp.backup.days', ['1', '3', '7', '14', '30'] as const, '7');

/** Paper for new pages (PRD 4.4); the owner's default is lined, college. */
export const inkPaper = choice<PaperStyle>(
  'mp.ink.paper',
  ['blank', 'lined-narrow', 'lined-college', 'lined-wide', 'dotted', 'grid', 'cornell'],
  'lined-college',
);

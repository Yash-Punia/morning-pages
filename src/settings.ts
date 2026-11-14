// Interim settings shim until the Dexie kv store lands (M3.1), which migrates these keys.
// Only non-journal preferences live here; DUR-8 keeps every important record out of localStorage.
import type { SmoothingLevel } from './ink/stroke.ts';
import type { PaperStyle } from './ink/types.ts';

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode: keep default */ } };

/** Anonymous usage counts: on by default, disclosed on the privacy page (TDD 9.4). */
export const analyticsAllowed = () => read('mp.analytics') !== 'off';
export const setAnalyticsAllowed = (on: boolean) => write('mp.analytics', on ? 'on' : 'off');

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

/** Paper for new pages (PRD 4.4); the owner's default is lined, college. */
export const inkPaper = choice<PaperStyle>(
  'mp.ink.paper',
  ['blank', 'lined-narrow', 'lined-college', 'lined-wide', 'dotted', 'grid', 'cornell'],
  'lined-college',
);

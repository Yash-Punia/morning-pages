// Interim settings shim until the Dexie kv store lands (M3.1), which migrates these keys.
// Only non-journal preferences live here; DUR-8 keeps every important record out of localStorage.
const KEY = { analytics: 'mp.analytics' } as const;

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode: keep default */ } };

/** Anonymous usage counts: on by default, disclosed on the privacy page (TDD 9.4). */
export const analyticsAllowed = () => read(KEY.analytics) !== 'off';
export const setAnalyticsAllowed = (on: boolean) => write(KEY.analytics, on ? 'on' : 'off');

/** Once-only markers for install_detected and the daily launch_perf event. */
export const once = (key: string, value = '1') => {
  if (read(`mp.once.${key}`) === value) return false;
  write(`mp.once.${key}`, value);
  return true;
};

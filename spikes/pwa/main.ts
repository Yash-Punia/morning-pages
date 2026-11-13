// S3 · Home Screen install, storage persistence, CSP and container separation.
import { hud, set, note } from '../shared/hud.ts';
import '../store/store.css';
import './pwa.css';

const CACHE = 'pwa-spike-v1';
let cspViolations = 0;
document.addEventListener('securitypolicyviolation', (e) => {
  cspViolations++;
  note(`CSP blocked ${e.blockedURI || 'inline'} (${e.violatedDirective})`);
  row('CSP violations', cspViolations);
});

const report = document.getElementById('report')!;
function row(key: string, value: unknown) {
  set(key, String(value));
  let dd = report.querySelector<HTMLElement>(`[data-k="${key}"]`);
  if (!dd) {
    const dt = document.createElement('dt');
    dt.textContent = key;
    dd = document.createElement('dd');
    dd.dataset.k = key;
    report.append(dt, dd);
  }
  dd.textContent = String(value);
}

/** Write a marker for this context and list markers from all contexts. */
function containerCheck(mode: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('spike-pwa', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('markers', { keyPath: 'mode' });
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('markers', 'readwrite');
      const store = tx.objectStore('markers');
      store.put({ mode, at: new Date().toISOString() });
      const all = store.getAll();
      tx.oncomplete = () => resolve(all.result.map((m: { mode: string; at: string }) => `${m.mode} @ ${m.at}`));
      tx.onerror = () => reject(tx.error);
    };
  });
}

async function main() {
  hud('pwa');
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  const mode = standalone ? 'home-screen app' : 'safari tab';
  row('Running as', mode);
  row('display-mode: standalone', matchMedia('(display-mode: standalone)').matches);
  row('navigator.standalone', String((navigator as { standalone?: boolean }).standalone));
  row('Online', navigator.onLine);
  row('Screen / viewport', `${screen.width}×${screen.height} / ${innerWidth}×${innerHeight} @${devicePixelRatio}x`);

  if (navigator.storage) {
    row('persisted() before', await navigator.storage.persisted());
    row('persist() result', await navigator.storage.persist().catch((e) => `error: ${e}`));
    row('persisted() after', await navigator.storage.persisted());
    const est = await navigator.storage.estimate();
    row('Storage usage / quota', `${((est.usage ?? 0) / 1e6).toFixed(1)} MB / ${((est.quota ?? 0) / 1e9).toFixed(1)} GB`);
  } else row('navigator.storage', 'not available');

  try {
    const markers = await containerCheck(mode);
    row('IndexedDB markers visible here', markers.join(' · '));
    row('Tab and app share storage?', markers.length > 1 ? 'YES (unexpected)' : 'no marker from the other context (expected after both have run)');
  } catch (e) { row('IndexedDB', `error: ${e}`); }

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/pwa/sw.js', { scope: '/pwa/' });
      await navigator.serviceWorker.ready;
      row('Service worker', reg.active ? 'active' : 'installing');
      row('Controlled by SW', !!navigator.serviceWorker.controller);
      // Seed the cache with everything this page loaded, so it opens offline next time.
      const urls = [location.pathname, ...performance.getEntriesByType('resource').map((r) => r.name)]
        .filter((u) => new URL(u, location.href).origin === location.origin && !u.includes('/__'));
      const cache = await caches.open(CACHE);
      await cache.addAll([...new Set(urls)]);
      row('Cached for offline', `${new Set(urls).size} files`);
    } catch (e) { row('Service worker', `error: ${e}`); }
  } else row('Service worker', 'not supported');

  const toolbar = [...document.scripts].some((s) => /vercel\.live|_vercel\/toolbar|feedback/i.test(s.src));
  row('Vercel Toolbar script present', toolbar);
  row('CSP violations', cspViolations);
}

main().catch((e) => row('Fatal', String(e)));

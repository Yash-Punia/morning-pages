import './styles/fonts.css';
import './styles/tokens.css';
import './styles/themes.css';
import './styles/base.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { route, startRouter } from './router.ts';
import { startServiceWorker } from './pwa/register.ts';
import { isInstalled } from './pwa/standalone.ts';
import { launchBucket } from './analytics/events.ts';
import { pageView, track } from './analytics/track.ts';
import { applyTheme, onboarded, once } from './settings.ts';
import { db } from './store/db.ts';
import { checkStorage } from './store/storage.ts';
import { log } from './store/log.ts';
import { inkMetrics } from './ink/metrics.ts';
import { get } from 'svelte/store';

applyTheme(); // before the first screen, so a pinned theme never flashes
const app = mount(App, { target: document.getElementById('app')! });

// ENT-1 / 4.3: a launch opens straight onto today's page, with no dialogs. Only the very first
// launch in this storage container shows onboarding, and only if nothing has been written here.
async function launch() {
  if (onboarded.get()) return '/today';
  const written = await db().entries.count().then((n) => n > 0, () => true);
  if (written) onboarded.set(); // a journal from before onboarding existed
  return written ? '/today' : '/onboarding';
}

// The local log (TDD 14): anything thrown and not caught, by name and message only.
addEventListener('error', (e) => log('error', String(e.message)));
addEventListener('unhandledrejection', (e) => {
  const r = e.reason as { name?: string; message?: string } | undefined;
  log('error', `${r?.name ?? 'Error'}: ${r?.message ?? String(r)}`);
});

startRouter(launch).then(() => {
  // Analytics after the first screen is up: never in the way of the page (TDD 9.4).
  const now = new Date();
  track('app_open', { mode: isInstalled() ? 'standalone' : 'browser', morning: now.getHours() < 12 });
  if (isInstalled() && once('install')) track('install_detected');
  // Cold launch is measured to the `writable` mark: the first page painted and taking ink (TDD 5.7).
  // A launch onto another screen (onboarding) isn't one.
  const t = get(route)?.template;
  if (t !== '/today' && t !== '/entry') inkMetrics.noLaunch();
  void inkMetrics.launch.then((ms) => {
    log('launch', `writable in ${Math.round(ms)} ms (${isInstalled() ? 'Home Screen app' : 'Safari tab'})`);
    if (once('launch-perf-day', now.toDateString())) track('launch_perf', { ms: launchBucket(ms) });
  });
  route.subscribe((r) => r && pageView(r.template));
  // STO-3: ask for persistent storage at every launch until granted. Reported anonymously when
  // the answer changes, and when a quota threshold is first crossed (TDD 9.4).
  void checkStorage().then(({ persisted, warn }) => {
    if (persisted !== null && once('persist-status', String(persisted))) {
      track('persist_status', { granted: persisted });
      log('storage', persisted ? 'protected from automatic clearing' : 'not protected (best effort)');
    }
    if (warn && once('storage-warning', String(warn))) {
      track('storage_warning', { pct: warn === 95 ? '95' : '80' });
      log('storage', `over ${warn} % of the quota`);
    }
  });
});
startServiceWorker();

export default app;

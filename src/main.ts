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
import { once } from './settings.ts';
import { checkStorage } from './store/storage.ts';

const app = mount(App, { target: document.getElementById('app')! });

startRouter().then(() => {
  // Analytics after the first screen is up: never in the way of the page (TDD 9.4).
  const now = new Date();
  track('app_open', { mode: isInstalled() ? 'standalone' : 'browser', morning: now.getHours() < 12 });
  if (isInstalled() && once('install')) track('install_detected');
  if (once('launch-perf-day', now.toDateString())) track('launch_perf', { ms: launchBucket(performance.now()) });
  route.subscribe((r) => r && pageView(r.template));
  // STO-3: ask for persistent storage at every launch until granted. Reported anonymously when
  // the answer changes, and when a quota threshold is first crossed (TDD 9.4).
  void checkStorage().then(({ persisted, warn }) => {
    if (persisted !== null && once('persist-status', String(persisted))) track('persist_status', { granted: persisted });
    if (warn && once('storage-warning', String(warn))) track('storage_warning', { pct: warn === 95 ? '95' : '80' });
  });
});
startServiceWorker();

export default app;

// Service worker registration from our own bundle (injectRegister: false), so no inline
// script lands in index.html (script-src 'self', TDD 10.4). Updates wait for the user.
import { writable } from 'svelte/store';
import { registerSW } from 'virtual:pwa-register';

/** True when a new version is waiting. The update banner (M4) reads this. */
export const needRefresh = writable(false);

let update: ((reload?: boolean) => Promise<void>) | undefined;

export function startServiceWorker() {
  update = registerSW({ onNeedRefresh: () => needRefresh.set(true) });
}

/** Apply a waiting update and reload. Callers must make sure the write queue is empty first. */
export const applyUpdate = () => update?.(true);

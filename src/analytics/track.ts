// Anonymous usage events to Umami's HTTP API, no third-party script (TDD 9.4, D-028, D-029).
// Sends only from a production build on the production host, only while the setting is on,
// never on the write path, and it can never throw into the app. Offline events are dropped.
import { analyticsAllowed } from '../settings.ts';
import { sanitize, type EventName, type EventProps } from './events.ts';

const ENDPOINT = 'https://gateway.umami.is/api/send';
const WEBSITE = import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined;
const PROD_HOST = import.meta.env.VITE_PRODUCTION_HOST as string | undefined;

let path = '/';
let firstView = true;

export const enabled = () =>
  import.meta.env.PROD && !!WEBSITE && !!PROD_HOST && location.hostname === PROD_HOST && analyticsAllowed();

/** `/entry/:id` → `/entry`: a route template, never a concrete path or query. */
export const templateUrl = (template: string) => template.replace(/\/:\w+/g, '') || '/';

function send(payload: Record<string, unknown>) {
  if (!enabled()) return;
  queueMicrotask(() => {
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        keepalive: true,
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'event',
          payload: { website: WEBSITE, hostname: location.hostname, url: path, language: navigator.language, screen: `${screen.width}x${screen.height}`, ...payload },
        }),
      }).catch(() => {});
    } catch { /* never surface analytics failures */ }
  });
}

export function pageView(template: string) {
  path = templateUrl(template);
  let referrer: string | undefined;
  if (firstView) {
    firstView = false;
    try {
      const host = document.referrer && new URL(document.referrer).hostname;
      if (host && host !== location.hostname) referrer = `https://${host}`; // external domain only, first view only
    } catch { /* malformed referrer */ }
  }
  send(referrer ? { referrer } : {});
}

export function track<E extends EventName>(name: E, data?: EventProps<E>) {
  const clean = sanitize(name, data as Record<string, unknown>);
  send(clean ? { name, data: clean } : { name });
}

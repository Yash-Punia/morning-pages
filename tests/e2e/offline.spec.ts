import { expect, test } from '@playwright/test';
import { preview, type PreviewServer } from 'vite';

// Real offline check: this test runs its own preview server and shuts it down, because
// Playwright's setOffline() breaks service-worker navigations in WebKit.
// (Uses the dist/ built by the webServer command in playwright.config.ts.)
const PORT = 4174;
let server: PreviewServer | undefined;

test.afterEach(async () => {
  if (server) await new Promise((r) => server!.httpServer.close(r));
});

test('installed service worker opens the app with the server gone', async ({ page }) => {
  server = await preview({ mode: 'http', logLevel: 'silent', preview: { port: PORT, strictPort: true } });
  const url = `http://localhost:${PORT}`;
  await page.goto(url);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // the first load is never controlled; the second is
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
  expect(manifest).toMatchObject({ id: '/', start_url: '/', name: 'Morning Pages', short_name: 'Morning Pages', display: 'standalone' });

  await new Promise((r) => server!.httpServer.close(r));
  server = undefined;

  await page.goto(`${url}/library`); // an app route, served from the precache via navigateFallback
  await expect(page.getByRole('heading', { name: 'Morning Pages' })).toBeVisible();
});

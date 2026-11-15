import { expect, test, type Page } from '@playwright/test';
import { SCHEMA } from '../../src/analytics/events.ts';
import { drag } from './ink-helpers.ts';

// Network allowlist + content canary (TDD 13.2, D-029). The test build's production host is
// 127.0.0.1; Umami is intercepted, so nothing leaves the machine.
const ORIGIN = 'http://127.0.0.1:4175';
const CANARY = 'CANARY-7f3a91';

async function capture(page: Page) {
  const sent: string[] = [];
  const stray: string[] = [];
  await page.route('https://gateway.umami.is/**', async (r) => {
    expect(r.request().method()).toBe('POST');
    expect(new URL(r.request().url()).pathname).toBe('/api/send');
    sent.push(r.request().postData() ?? '');
    await r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  page.on('request', (req) => {
    const origin = new URL(req.url()).origin;
    if (origin !== ORIGIN && origin !== 'https://gateway.umami.is') stray.push(req.url());
  });
  return { sent, stray };
}

test('sends only allowlisted, content-free events, and only to Umami', async ({ page }) => {
  const { sent, stray } = await capture(page);
  await page.goto(`${ORIGIN}/today`);
  await page.goto(`${ORIGIN}/entry/${CANARY}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Entry not found' })).toBeVisible();
  await expect.poll(() => sent.length).toBeGreaterThanOrEqual(3);

  const payloads = sent.map((b) => {
    expect(b).not.toContain(CANARY);
    const { type, payload } = JSON.parse(b);
    expect(type).toBe('event');
    expect(payload.website).toBe('e2e-test-site');
    expect(payload.hostname).toBe('127.0.0.1');
    expect(payload.url).toMatch(/^\/[a-z]*$/); // a route template, never an id or query
    if (payload.name) {
      expect(Object.keys(SCHEMA)).toContain(payload.name);
      for (const [k, v] of Object.entries(payload.data ?? {}))
        expect((SCHEMA as Record<string, Record<string, readonly unknown[]>>)[payload.name]![k]).toContain(v);
    }
    return payload;
  });
  expect(payloads.map((p) => p.name).filter(Boolean)).toContain('app_open');
  expect(payloads.map((p) => p.url)).toEqual(expect.arrayContaining(['/today', '/entry']));
  expect(stray).toEqual([]);
});

test('typed text, ink and ids never leave the device; the app only GETs its own files', async ({ page, context }) => {
  // TDD 13.2: every request, from the page or any worker, is a same-origin GET (the app's own
  // files) or an allowlisted POST to Umami. A canary typed as the title, the ink, and the real
  // entry id must appear in none of them.
  const requests: { url: string; method: string; body: string }[] = [];
  await page.route('https://gateway.umami.is/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  context.on('request', (req) => requests.push({ url: req.url(), method: req.method(), body: req.postData() ?? '' }));

  await page.setViewportSize({ width: 1366, height: 1024 });
  await page.goto(`${ORIGIN}/today`);
  await page.waitForFunction(() => performance.getEntriesByName('writable').length === 1);
  const title = page.getByRole('textbox', { name: 'Entry title' });
  await title.fill(`${CANARY} a slow start`);
  await title.press('Enter');
  for (let i = 0; i < 3; i++) await drag(page, 'pen', { x: 200, y: 500 + i * 40 }, { x: 600, y: 500 + i * 40 });
  await expect(page.locator('[data-state]')).toHaveAttribute('data-state', 'saved');
  await page.waitForTimeout(700); // the title is saved after a 500 ms pause in typing
  await expect(page.locator('[data-state]')).toHaveAttribute('data-state', 'saved');
  const entryId = await page.evaluate(() => (window as unknown as { __ink: { doc: { entry: { id: string } } } }).__ink.doc.entry.id);
  expect(entryId).toMatch(/[0-9a-f-]{36}/);

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => requests.filter((r) => r.body.includes('"session_end"')).length).toBe(1);

  const umami = requests.filter((r) => r.url.startsWith('https://gateway.umami.is/'));
  expect(umami.length).toBeGreaterThanOrEqual(3); // page view, app_open, entry_started, session_end
  for (const r of requests) {
    expect(r.url + r.body).not.toContain(CANARY);
    expect(r.url + r.body).not.toContain(entryId);
    if (new URL(r.url).origin === ORIGIN) expect(r.method, r.url).toBe('GET');
    else {
      expect(r.url).toBe('https://gateway.umami.is/api/send');
      expect(r.method).toBe('POST');
      const { payload } = JSON.parse(r.body);
      if (payload.name) expect(Object.keys(SCHEMA)).toContain(payload.name);
    }
  }
});

test('sends nothing when usage counts are switched off', async ({ page }) => {
  const { sent } = await capture(page);
  await page.addInitScript(() => localStorage.setItem('mp.analytics', 'off'));
  await page.goto(`${ORIGIN}/today`);
  await page.goto(`${ORIGIN}/library`);
  await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
  await page.waitForTimeout(500);
  expect(sent).toEqual([]);
});

test('the Settings switch stops events immediately', async ({ page }) => {
  const { sent } = await capture(page);
  await page.goto(`${ORIGIN}/settings`);
  const toggle = page.getByRole('switch', { name: 'Share anonymous usage counts' });
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  const before = sent.length;
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Library', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
  await page.waitForTimeout(500);
  expect(sent.length).toBe(before);
});

test('nothing is sent from any other host (previews, localhost)', async ({ page }) => {
  const { sent } = await capture(page);
  await page.goto('/today');
  await page.goto('/library');
  await page.waitForTimeout(500);
  expect(sent).toEqual([]);
});

test('leaving after writing sends one bucketed session summary; entry_started counts the first stroke', async ({ page }) => {
  const { sent } = await capture(page);
  await page.setViewportSize({ width: 1366, height: 1024 });
  await page.goto(`${ORIGIN}/today`);
  await page.waitForFunction(() => '__ink' in window);
  const box = (await page.locator('[data-ink]').boundingBox())!;
  await page.evaluate(async ({ box }) => {
    const el = document.querySelector('[data-ink]')!;
    const fire = (type: string, x: number) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 3, pointerType: 'pen', isPrimary: true, clientX: box.x + x, clientY: box.y + 500, pressure: 0.5, buttons: type === 'pointerup' ? 0 : 1 }));
    fire('pointerdown', 200);
    for (let i = 1; i <= 8; i++) { fire('pointermove', 200 + i * 30); await new Promise((r) => setTimeout(r, 8)); }
    fire('pointerup', 440);
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange')); // a second hide sends nothing more
  }, { box });
  const named = () => sent.map((b) => JSON.parse(b).payload).filter((p) => p.name);
  await expect.poll(() => named().filter((p) => p.name === 'session_end').length).toBe(1);
  expect(named().find((p) => p.name === 'session_end')!.data).toEqual({ minutes: '0-5', pages: '1', tools: 'ballpoint', eraser: false });
  expect(named().find((p) => p.name === 'entry_started')!.data).toEqual({ template: 'none', input: 'pen' });
});

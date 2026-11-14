import { expect, test, type Page } from '@playwright/test';
import { SCHEMA } from '../../src/analytics/events.ts';

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
  await expect(page.getByRole('heading', { level: 1, name: 'Entry' })).toBeVisible();
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

import { expect, test } from '@playwright/test';

test('app boots with no errors, no CSP violations and no third-party requests', async ({ page, baseURL }) => {
  const errors: string[] = [];
  const offOrigin: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (r) => { if (!r.url().startsWith(baseURL!)) offOrigin.push(r.url()); });
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    addEventListener('securitypolicyviolation', (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Morning Pages' })).toBeVisible();

  // Self-hosted fonts (D-012, PRI-3): both faces load from our own origin.
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([document.fonts.load('1rem "Atkinson Hyperlegible Next Variable"'), document.fonts.load('1rem "Fraunces Variable"')]);
    return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family);
  });
  expect(fonts).toEqual(expect.arrayContaining(['Atkinson Hyperlegible Next Variable', 'Fraunces Variable']));

  expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)).toEqual([]);
  expect(errors).toEqual([]);
  expect(offOrigin).toEqual([]);
});

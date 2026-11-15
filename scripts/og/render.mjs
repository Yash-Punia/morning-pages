// Renders scripts/og/og.html to public/og.png (1200 × 630) with Playwright's WebKit.
// Run once after changing the template: node scripts/og/render.mjs
import { webkit } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(`${here}og.html`).href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: fileURLToPath(new URL('../../public/og.png', import.meta.url)) });
await browser.close();
console.log('public/og.png written');

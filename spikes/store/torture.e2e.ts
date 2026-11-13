// Secondary check for S2: run the torture page headless in Playwright WebKit.
// Desktop WebKit is not iPadOS Safari; the iPad runs are the real gate.
// Usage: npm run torture -- [cycles=40] [speed=8]
import { webkit } from 'playwright';
import { build, preview } from 'vite';

const [cycles = '40', speed = '8'] = process.argv.slice(2);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

await build({ mode: 'http', logLevel: 'warn' });
const server = await preview({ mode: 'http', preview: { port: 4179, strictPort: true } });
const browser = await webkit.launch();
try {
  const page = await browser.newPage();
  await page.goto(`http://localhost:4179/store/?fresh=1&auto=1&cycles=${cycles}&speed=${speed}`);
  const deadline = Date.now() + 20 * 60_000;
  while (Date.now() < deadline) {
    // The page reloads itself, so poll instead of waitForFunction.
    if ((await page.title().catch(() => '')) === 'DONE') break;
    await sleep(1000);
  }
  const r = (await page.evaluate(() => (window as unknown as { __results: { metrics: Record<string, unknown> } }).__results)).metrics;
  console.log(JSON.stringify(r, null, 2));
  const ok = r['LOST'] === 0 && r['DUPLICATED'] === 0 && String(r['cycles (auto reloads)']).startsWith(cycles);
  console.log(ok ? 'PASS' : 'FAIL');
  process.exitCode = ok ? 0 : 1;
} finally {
  await browser.close();
  server.httpServer.close();
}

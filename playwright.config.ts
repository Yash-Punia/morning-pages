import { defineConfig, devices } from '@playwright/test';

// WebKit only: the product runs in iPadOS Safari. Desktop WebKit is not iPad Safari,
// so real-device testing stays a release gate (TDD 13.2).
//
// The test build treats 127.0.0.1 as the production host, so analytics fire only when a test
// opts in by visiting that host; every other test uses localhost and sends nothing (TDD 13.2).
export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4175' },
  projects: [{ name: 'webkit', use: { ...devices['Desktop Safari'] } }],
  webServer: {
    command: 'npm run build && npx vite preview --mode http --port 4175 --strictPort',
    url: 'http://localhost:4175',
    reuseExistingServer: false,
    timeout: 120_000,
    // VITE_E2E exposes the ink engine as window.__ink for tests that need a 50-page entry.
    env: { VITE_PRODUCTION_HOST: '127.0.0.1', VITE_UMAMI_WEBSITE_ID: 'e2e-test-site', VITE_E2E: '1' },
  },
});

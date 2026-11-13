import { defineConfig, devices } from '@playwright/test';

// WebKit only: the product runs in iPadOS Safari. Desktop WebKit is not iPad Safari,
// so real-device testing stays a release gate (TDD 13.2).
export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173' },
  projects: [{ name: 'webkit', use: { ...devices['Desktop Safari'] } }],
  webServer: {
    command: 'npm run build && npx vite preview --mode http --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

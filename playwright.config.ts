import { defineConfig, devices } from '@playwright/test'

/**
 * PWA tests need the production build (the service worker's precache list
 * is injected at build time). Everything else runs against the dev server.
 */
const isPwa = process.env.PWA_E2E === '1'

export default defineConfig({
  testDir: './tests/e2e',
  // PWA specs only run in the PWA_E2E=1 (production build) configuration.
  testIgnore: isPwa ? undefined : '**/pwa.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: isPwa ? 'http://localhost:4173' : 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: isPwa
    ? {
        command: 'npm run build && npm run preview -- --port 4173',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      }
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
      },
})

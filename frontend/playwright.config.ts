import { defineConfig, devices } from '@playwright/test';

// Default: run all browsers locally.
// Set PW_ONLY_CHROMIUM=true to run only Chromium (useful for environments missing deps).
const ONLY_CHROMIUM = process.env.PW_ONLY_CHROMIUM === 'true';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [['html'], ['junit', { outputFile: 'test-results/junit.xml' }]],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'VITE_MOCK_API=true npm run dev -- --host --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  projects:
    // In CI you may still want to run just one browser for speed/stability.
    (process.env.CI ? true : ONLY_CHROMIUM)
      ? [
          {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
          },
        ]
      : [
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
});

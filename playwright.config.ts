import { defineConfig, devices } from '@playwright/test';
import { config } from './src/config/env.config';

export default defineConfig({
  testDir: './tests',
  // Full E2E against staging can exceed 60s (search alone waits up to 90s).
  timeout: process.env.CI ? 180_000 : 120_000,
  expect: {
    timeout: config.defaultTimeout,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: config.retries,
  workers: config.workers,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: config.baseUrl,
    headless: config.headless,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: config.navigationTimeout,
    actionTimeout: config.defaultTimeout,
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
});

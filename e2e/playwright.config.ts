import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:6767',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: [
    {
      command: 'npm run dev:server',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      cwd: '../',
    },
    {
      command: 'npm run dev:client',
      port: 6767,
      reuseExistingServer: !process.env.CI,
      cwd: '../',
    },
  ],
});

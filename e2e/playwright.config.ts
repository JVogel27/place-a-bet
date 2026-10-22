import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

// Throwaway SQLite file so the dev server never touches (or depends on) server/data.
const e2eDatabaseUrl = path.join(os.tmpdir(), 'place-a-bet-e2e', 'place-a-bet.db');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:6767',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // The sandbox container drops the capabilities Chromium's sandbox needs.
        launchOptions: { args: ['--no-sandbox'] },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
        launchOptions: { args: ['--no-sandbox'] },
      },
    },
  ],

  webServer: [
    {
      command: 'npm run db:migrate --workspace=server && npm run dev:server',
      port: 3001,
      env: { DATABASE_URL: e2eDatabaseUrl },
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

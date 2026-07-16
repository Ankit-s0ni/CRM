import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  preserveOutput: 'always',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:4002',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'PLATFORM_MFA_REQUIRED=false pnpm --dir ../.. --filter api start',
      url: 'http://localhost:4001/healthz',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:4002/platform/login',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});

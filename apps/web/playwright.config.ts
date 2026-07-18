import { defineConfig } from '@playwright/test';

const mockApi = process.env.PLAYWRIGHT_MOCK_API === 'true';

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
    ...(!mockApi
      ? [{
          command: 'PLATFORM_MFA_REQUIRED=false FIELD_REDIS_MODE=disabled FIELD_QUEUE_MODE=inline ATTENDANCE_QUEUE_MODE=disabled IMPORT_QUEUE_MODE=inline pnpm --dir ../.. --filter api start',
          url: 'http://localhost:4001/healthz',
          reuseExistingServer: true,
          timeout: 120_000,
        }]
      : []),
    {
      command: 'pnpm dev',
      url: 'http://localhost:4002/platform/login',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});

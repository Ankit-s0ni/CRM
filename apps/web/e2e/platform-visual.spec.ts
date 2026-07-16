import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const references = resolve(process.cwd(), 'public/stitch/sprint-2');
const viewports = [
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 },
];
test.beforeEach(async ({ page }) => {
  await page.goto('/platform/login');
  await page.getByLabel('Work email').fill('owner@deltcrm.local');
  await page.getByLabel('Password').fill('PlatformAdmin123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/platform/tenants');
});

for (const viewport of viewports) {
  test.describe(`${viewport.width}px Stitch contracts`, () => {
    test.use({ viewport });

    for (const screen of [
      { key: 'S1-platform-dashboard', path: '/platform', heading: 'Regional Operations Center' },
      { key: 'S2-tenants-list', path: '/platform/tenants', heading: 'Tenants' },
      { key: 'S9-module-management', path: '/platform/modules', heading: 'Module Management' },
      { key: 'S10-global-audit-logs', path: '/platform/audit', heading: 'Global Audit Logs' },
      { key: 'S11-system-health-alerts', path: '/platform/health', heading: 'System Observability' },
    ]) {
      test(`${screen.key} matches its archived visual contract`, async ({ page }) => {
        await page.goto(screen.path);
        await expect(page.getByRole('heading', { name: screen.heading })).toBeVisible();
        await expectPlatformShell(page);
        await compareWithStitch(page, screen.key);
      });
    }

    test('S3 tenant detail matches its archived visual contract', async ({ page }) => {
      await page.goto('/platform/tenants');
      const href = await page.locator('a[href^="/platform/tenants/"]').first().getAttribute('href');
      expect(href).toBeTruthy();
      await page.goto(href!);
      await expect(page.getByText('Danger Zone')).toBeVisible();
      await expectPlatformShell(page);
      await compareWithStitch(page, 'S3-tenant-detail');
    });

    test('S4 create tenant matches its archived visual contract', async ({ page }) => {
      await page.goto('/platform/tenants');
      await page.getByRole('button', { name: 'Create Tenant' }).click();
      await expect(page.getByRole('heading', { name: 'Create new tenant' })).toBeVisible();
      await compareWithStitch(page, 'S4-create-tenant');
    });
  });
}

test.describe('Platform screen states', () => {
  test.use({ viewport: { width: 1024, height: 900 } });

  test('tenant directory exposes loading and empty states', async ({ page }) => {
    await page.route('**/platform/tenants?**', async (route) => {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 800));
      await route.fulfill({ json: { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } } });
    });
    await page.goto('/platform/tenants');
    await expect(page.locator('.animate-pulse').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No tenants found' })).toBeVisible();
  });

  test('tenant directory exposes API error state', async ({ page }) => {
    await page.route('**/platform/tenants?**', (route) => route.fulfill({ status: 500, json: { code: 'TEST_FAILURE' } }));
    await page.goto('/platform/tenants');
    await expect(page.getByText(/We couldn't load tenants/)).toBeVisible();
  });

  test('audit screen exposes forbidden state without leaking data', async ({ page }) => {
    await page.route('**/platform/audit-logs?**', (route) => route.fulfill({ status: 403, json: { code: 'PLATFORM_PERMISSION_DENIED' } }));
    await page.goto('/platform/audit');
    await expect(page.getByText('Audit records could not be loaded.')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(0);
  });

  test('create tenant keeps invalid forms blocked', async ({ page }) => {
    await page.goto('/platform/tenants');
    await page.getByRole('button', { name: 'Create Tenant' }).click();
    await page.getByRole('button', { name: 'Create & send invite' }).click();
    await expect(page.getByRole('heading', { name: 'Create new tenant' })).toBeVisible();
    const valid = await page
      .getByLabel('Company name')
      .evaluate((element: HTMLInputElement) => element.checkValidity());
    expect(valid).toBe(false);
  });

  test('health screen renders degraded dependency state', async ({ page }) => {
    await page.route('http://localhost:4001/platform/health', (route) =>
      route.fulfill({
        json: {
          status: 'degraded',
          checkedAt: new Date(0).toISOString(),
          services: {
            api: { status: 'up', latencyMs: 1 },
            database: { status: 'up', latencyMs: 4 },
            redis: { status: 'down', latencyMs: 2001 },
            objectStorage: { status: 'down', latencyMs: 2002 },
            queue: { status: 'degraded', pending: 42, deadLettered: 2 },
          },
        },
      }),
    );
    await page.goto('/platform/health');
    await expect(page.getByText('DOWN', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('DEGRADED')).toBeVisible();
  });
});

async function expectPlatformShell(page: Page) {
  await expect(page.getByText('IndigoHR').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tenants', exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function compareWithStitch(page: Page, key: string) {
  await page.evaluate(() => document.fonts.ready);
  const actualBuffer = await page.screenshot({ animations: 'disabled', fullPage: true });
  const actual = PNG.sync.read(actualBuffer);
  const reference = PNG.sync.read(readFileSync(resolve(references, `${key}.png`)));
  const scaledReference = resizeNearest(reference, actual.width, actual.height);
  const diff = new PNG({ width: actual.width, height: actual.height });
  const different = pixelmatch(actual.data, scaledReference.data, diff.data, actual.width, actual.height, {
    threshold: 0.2,
    includeAA: false,
  });
  const ratio = different / (actual.width * actual.height);
  console.log(`${key} Stitch pixel difference: ${(ratio * 100).toFixed(2)}%`);
  test.info().annotations.push({ type: 'stitch-diff', description: `${key}: ${(ratio * 100).toFixed(2)}%` });
  await test.info().attach(`${key}-actual`, { body: actualBuffer, contentType: 'image/png' });
  await test.info().attach(`${key}-diff`, { body: PNG.sync.write(diff), contentType: 'image/png' });
  expect(ratio, `${key} diverged materially from the archived Stitch composition`).toBeLessThan(0.3);
}

function resizeNearest(source: PNG, width: number, height: number) {
  const target = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.floor((y / height) * source.height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor((x / width) * source.width));
      const from = (sourceY * source.width + sourceX) * 4;
      const to = (y * width + x) * 4;
      target.data[to] = source.data[from];
      target.data[to + 1] = source.data[from + 1];
      target.data[to + 2] = source.data[from + 2];
      target.data[to + 3] = source.data[from + 3];
    }
  }
  return target;
}

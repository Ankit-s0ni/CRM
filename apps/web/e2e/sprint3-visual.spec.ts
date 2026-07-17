import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const references = resolve(process.cwd(), 'public/stitch/sprint-3');
const tenantId = '019f6987-3b0e-7010-955b-4c2f6b840702';

const screens = [
  { key: 'B1-onboarding', path: '/app/onboarding', heading: "Let's build your workspace" },
  { key: 'B2-company-settings', path: '/app/settings/company', heading: 'Company Settings' },
  { key: 'B3-organization', path: '/app/organization', heading: 'Organization Builder' },
  { key: 'B4-employees', path: '/app/employees', heading: 'Employees' },
  { key: 'B5-employee-editor', path: '/app/employees/new', heading: 'Add Employee' },
  { key: 'B6-employee-import', path: '/app/imports/employees', heading: 'Bulk Import' },
  { key: 'B7-users-roles', path: '/app/access', heading: 'Users & Roles' },
  { key: 'B9-attendance-defaults', path: '/app/settings/attendance', heading: 'Master Attendance & Security Policies' },
  { key: 'H4-offices-geofences', path: '/app/attendance/offices', heading: 'Office Locations & Geofences' },
  { key: 'H5-policies', path: '/app/attendance/policies', heading: 'Attendance Policies' },
  { key: 'H6-shifts', path: '/app/attendance/shifts', heading: 'Shifts Management' },
  { key: 'H7-rosters', path: '/app/attendance/rosters', heading: 'Roster Planner' },
  { key: 'H8-holidays', path: '/app/attendance/holidays', heading: 'Holiday Calendar' },
];

test.beforeEach(async ({ page }) => login(page));

for (const viewport of [
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 },
]) {
  test.describe(`${viewport.width}px Sprint 3 Stitch contracts`, () => {
    test.use({ viewport });

    test('renders every B/H screen against its archived composition', async ({ page }) => {
      for (const screen of screens) {
        await page.goto(screen.path);
        await expect(page.getByRole('heading', { name: screen.heading })).toBeVisible();
        await expectNoOverflow(page);
        await expectNoCollapsedContent(page);
        await compareWithStitch(page, screen.key);
      }

      await page.goto('/app/access');
      const roleHref = await page.locator('a[href^="/app/access/roles/"]').first().getAttribute('href');
      expect(roleHref).toBeTruthy();
      await page.goto(roleHref!);
      await expect(page.getByText('Select the exact permission keys granted to this role.')).toBeVisible();
      await expectNoOverflow(page);
      await expectNoCollapsedContent(page);
      await compareWithStitch(page, 'B8-role-editor');
    });
  });
}

test.describe('390px mobile-safe tenant admin', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('keeps every Sprint 3 route usable without page overflow', async ({ page }) => {
    for (const screen of screens) {
      await page.goto(screen.path);
      await expect(page.getByRole('heading', { name: screen.heading })).toBeVisible();
      await expectNoOverflow(page);
      await expectNoCollapsedContent(page);
    }
  });
});

test.describe('Sprint 3 screen behavior and states', () => {
  test.use({ viewport: { width: 1024, height: 900 } });

  test('resolves a workspace-only login and toggles password visibility', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login?workspace=acme');
    await page.getByLabel('Email Address').fill('admin@acme.com');
    await page.locator('#password').fill('TenantAdmin123!');

    const password = page.locator('#password');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(password).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/app(?:\/onboarding)?$/);
  });

  test('continues onboarding through the employee creation entry point', async ({ page }) => {
    let latestSettingsUpdate: Record<string, unknown> | undefined;
    await page.route('**/onboarding/status', (route) =>
      route.fulfill({
        status: 200,
        json: { data: { completed: false, currentStep: 1, steps: {} } },
      }),
    );
    await page.route('**/tenant-settings', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          json: {
            data: {
              timezone: 'Asia/Kolkata',
              weeklyOffs: [{ weekday: 'SAT', occurrences: [2, 4] }, 'SUN'],
              workingDayStart: '09:00',
              workingDayEnd: '18:00',
              onboardingStep: 1,
            },
          },
        });
      }
      latestSettingsUpdate = route.request().postDataJSON() as Record<string, unknown>;
      return route.fulfill({ status: 200, json: { data: {} } });
    });
    await page.route('**/roles', (route) =>
      route.fulfill({ status: 200, json: { data: [{ id: 'hr-role', name: 'HR_ADMIN' }] } }),
    );
    await page.route('**/onboarding/complete', (route) =>
      route.fulfill({ status: 201, json: { data: { completed: true } } }),
    );

    await page.goto('/app/onboarding');
    await expect(page.getByRole('heading', { name: "Let's build your workspace" })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Define your working week' })).toBeVisible();
    await page.getByRole('button', { name: 'Friday + Saturday' }).click();
    await expect(page.getByText('Every Friday, Every Saturday')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    expect(latestSettingsUpdate).toMatchObject({
      weeklyOffs: [{ weekday: 'FRI' }, { weekday: 'SAT' }],
    });
    await expect(page.getByRole('heading', { name: 'Set verification defaults' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Invite your HR team' })).toBeVisible();
    await page.getByRole('button', { name: 'Finish setup' }).click();
    await page.waitForURL('**/app');

    await page.goto('/app/employees');
    await page.getByRole('button', { name: 'Add employee' }).click();
    await expect(page.getByRole('heading', { name: 'Add Employee' })).toBeVisible();
  });

  test('opens every API-backed configuration interaction', async ({ page }) => {
    await page.goto('/app/attendance/offices');
    await page.getByRole('button', { name: 'Add office' }).click();
    await expect(page.getByRole('heading', { name: 'Add office' })).toBeVisible();

    await page.goto('/app/attendance/policies');
    await page.getByRole('button', { name: 'Create policy' }).click();
    await expect(page.getByRole('heading', { name: 'Create attendance policy' })).toBeVisible();

    await page.goto('/app/attendance/shifts');
    await page.getByRole('button', { name: 'Add new shift' }).click();
    await expect(page.getByRole('heading', { name: 'Add new shift' })).toBeVisible();

    await page.goto('/app/attendance/rosters');
    await page.getByRole('button', { name: 'Bulk assign' }).click();
    await expect(page.getByRole('heading', { name: 'Bulk assign shifts' })).toBeVisible();

    await page.goto('/app/attendance/holidays');
    await page.getByRole('button', { name: 'Add holiday' }).click();
    await expect(page.getByRole('heading', { name: 'Add holiday' })).toBeVisible();

    await page.goto('/app/access');
    await page.getByRole('button', { name: 'Invite user' }).click();
    await expect(page.getByRole('heading', { name: 'Invite workspace user' })).toBeVisible();
  });

  test('shows loading, API error, forbidden, and invalid form states', async ({ page }) => {
    let releaseOffices: (() => Promise<void>) | undefined;
    await page.route('http://localhost:4001/offices', (route) => {
      releaseOffices = () =>
        route.fulfill({ status: 500, json: { code: 'TEST_FAILURE' } });
    });
    await page.goto('/app/attendance/offices');
    await expect.poll(() => Boolean(releaseOffices)).toBe(true);
    await expect(page.locator('.animate-pulse').first()).toBeVisible();
    await releaseOffices!();
    await expect(page.getByText('Office locations could not be loaded.')).toBeVisible();
    await page.unroute('http://localhost:4001/offices');

    await page.route('http://localhost:4001/attendance-policies', (route) =>
      route.fulfill({ status: 403, json: { code: 'PERMISSION_DENIED' } }),
    );
    await page.goto('/app/attendance/policies');
    await expect(page.getByText('Policies could not be loaded.')).toBeVisible();
    await page.unroute('http://localhost:4001/attendance-policies');

    await page.goto('/app/attendance/shifts');
    await page.getByRole('button', { name: 'Add new shift' }).click();
    await page.getByRole('button', { name: 'Save shift' }).click();
    await expect(page.getByText('Shift could not be saved.')).toBeVisible();
  });

  test('redirects a suspended workspace consistently', async ({ page }) => {
    await page.route('**/workspace/modules', (route) =>
      route.fulfill({
        status: 403,
        json: { code: 'TENANT_SUSPENDED', message: 'Workspace suspended' },
      }),
    );
    await page.goto('/app/employees');
    await expect(page).toHaveURL(/workspace-unavailable\?code=TENANT_SUSPENDED/);
    await expect(page.getByRole('heading', { name: 'This workspace is unavailable' })).toBeVisible();
  });

  test('shows unsaved settings and confirms destructive changes', async ({ page }) => {
    await page.goto('/app/settings/company');
    await page.getByLabel('Working day start').fill('08:30');
    await expect(page.getByText('Unsaved changes detected')).toBeVisible();
    await page.getByLabel('Working day start').fill('09:00');
    await page.getByRole('button', { name: 'Save changes' }).last().click();
    await expect(page.getByText('Unsaved changes detected')).toBeHidden();

    await page.goto('/app/attendance/shifts');
    await page.getByRole('button', { name: 'Edit shift' }).first().click();
    let dialogType = '';
    page.once('dialog', async (dialog) => {
      dialogType = dialog.type();
      await dialog.dismiss();
    });
    await page.getByRole('button', { name: 'Delete' }).click();
    expect(dialogType).toBe('confirm');
    await expect(page.getByRole('heading', { name: 'Edit shift' })).toBeVisible();
  });

  test('configures occurrence-based weekly offs in Company Settings', async ({ page }) => {
    let savedSettings: Record<string, unknown> | undefined;
    await page.route('**/tenant-settings', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          json: {
            data: {
              timezone: 'Asia/Dubai',
              weeklyOffs: [{ weekday: 'SAT' }, { weekday: 'SUN' }],
              workingDayStart: '09:00',
              workingDayEnd: '18:00',
              requireFacialRecognition: false,
              faceMatchThreshold: 85,
              fieldTrackingIntervalMin: 15,
              checkinReminderEnabled: true,
              checkoutReminderMinutes: 15,
              absenteeAlertTime: '10:00',
              onboardingStep: 4,
            },
          },
        });
      }
      savedSettings = route.request().postDataJSON() as Record<string, unknown>;
      return route.fulfill({ status: 200, json: { data: savedSettings } });
    });

    await page.goto('/app/settings/company');
    const friday = page.getByRole('group', { name: 'Friday weekly off' });
    await friday.getByRole('checkbox', { name: 'Friday' }).click();
    await friday.getByRole('combobox', { name: 'Friday recurrence' }).selectOption('selected');
    await friday.getByRole('checkbox', { name: '2nd' }).click();
    await friday.getByRole('checkbox', { name: '1st' }).click();
    await expect(page.getByText('2nd Friday, Every Saturday, Every Sunday')).toBeVisible();
    await page.getByRole('button', { name: 'Save changes' }).last().click();

    expect(savedSettings).toMatchObject({
      weeklyOffs: [
        { weekday: 'FRI', occurrences: [2] },
        { weekday: 'SAT' },
        { weekday: 'SUN' },
      ],
    });
  });

  test('renders the shared dashboard with Business Admin additions', async ({ page }) => {
    await mockDashboard(page);
    await page.goto('/app');

    await expect(page.getByRole('heading', { name: 'Live Attendance' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Business Admin overview' })).toBeVisible();
    await expect(page.getByText('Every Friday')).toBeHidden();
    await expect(page.getByText('142')).toBeVisible();
    await expect(page.getByText('Rajesh Kumar')).toBeVisible();
    const attention = page.getByRole('complementary');
    await expect(attention.getByText('3', { exact: true })).toBeVisible();
    await expect(attention.getByText('Pending regularizations')).toBeVisible();
    await expectNoOverflow(page);
    await expectNoCollapsedContent(page);
  });

  test('uses the same dashboard for HR without requesting owner additions', async ({ page }) => {
    let ownerRequestCount = 0;
    await page.route('**/auth/me', (route) =>
      route.fulfill({
        status: 200,
        json: authMeFixture([
          'attendance.records.read',
          'organization.employees.read',
        ], ['HR_ADMIN']),
      }),
    );
    for (const path of ['**/employees/quota', '**/users']) {
      await page.route(path, (route) => {
        ownerRequestCount += 1;
        return route.fulfill({ status: 200, json: { data: [] } });
      });
    }
    await mockDashboard(page, false);
    await page.goto('/app');

    await expect(page.getByRole('heading', { name: 'Live Attendance' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Business Admin overview' })).toBeHidden();
    expect(ownerRequestCount).toBe(0);
  });

  test('keeps the shared dashboard usable on a 390px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockDashboard(page);
    await page.goto('/app');

    await expect(page.getByRole('heading', { name: 'Live Attendance' })).toBeVisible();
    await expect(page.getByText('Rajesh Kumar')).toBeVisible();
    await expectNoOverflow(page);
    await expectNoCollapsedContent(page);
  });
});

async function login(page: Page) {
  await page.route('**/onboarding/status', (route) =>
    route.fulfill({
      status: 200,
      json: { data: { completed: false, currentStep: 1, steps: {} } },
    }),
  );
  await page.route('**/auth/me', (route) =>
    route.fulfill({
      status: 200,
      json: authMeFixture([
        'attendance.records.read',
        'organization.employees.read',
        'workspace.dashboard.admin.read',
      ], ['BUSINESS_ADMIN']),
    }),
  );
  await page.goto(`/login?tenantId=${tenantId}&workspace=acme`);
  await page.getByLabel('Email Address').fill('admin@acme.com');
  await page.locator('#password').fill('TenantAdmin123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/app/onboarding');
}

async function mockDashboard(page: Page, includeOwnerMocks = true) {
  await page.route('**/attendance/dashboard?*', (route) =>
    route.fulfill({
      status: 200,
      json: {
        data: {
          date: '2026-07-17',
          timezone: 'Asia/Muscat',
          summary: { present: 142, late: 11, absent: 9, onField: 34, onBreak: 6, notYetIn: 18 },
          employees: [
            {
              id: 'employee-1', employeeCode: 'EMP-001', fullName: 'Rajesh Kumar',
              designation: 'Senior Logistics Analyst', department: { id: 'department-1', name: 'Operations' },
              workType: 'OFFICE', status: 'CLOCKED_IN', lateMinutes: 0,
              checkinTime: '2026-07-17T05:14:00.000Z', office: { id: 'office-1', officeName: 'Muscat HQ' },
              shift: { id: 'shift-1', name: 'Day' },
            },
          ],
          attention: { pendingRegularizations: 3, openSecurityViolations: 2, absenteeAlerts: 5 },
          updatedAt: new Date().toISOString(), nextCursor: null,
        },
      },
    }),
  );
  if (includeOwnerMocks) {
    await page.route('**/employees/quota', (route) => route.fulfill({ status: 200, json: { data: { used: 190, limit: 200, percentage: 95 } } }));
    await page.route('**/users', (route) => route.fulfill({ status: 200, json: { data: [{ id: 'user-1' }, { id: 'user-2' }] } }));
  }
}

function authMeFixture(permissions: string[], roles: string[]) {
  return {
    user: { id: 'admin-user', email: 'admin@acme.com', roles, permissions },
    workspace: { id: tenantId, companyName: 'Acme Technologies', subdomain: 'acme', status: 'ACTIVE' },
  };
}

async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectNoCollapsedContent(page: Page) {
  const collapsed = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[class*="max-w-"]'))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          style.display !== 'none' &&
          rect.height > 0 &&
          rect.width < 96 &&
          (element.textContent?.trim().length ?? 0) >= 20
        );
      })
      .map((element) => ({
        className: element.className,
        text: element.textContent?.trim().slice(0, 80),
        width: element.getBoundingClientRect().width,
      })),
  );
  expect(collapsed, 'content container collapsed below 96px').toEqual([]);
}

async function compareWithStitch(page: Page, key: string) {
  await page.evaluate(() => document.fonts.ready);
  const actualBuffer = await page.screenshot({ animations: 'disabled' });
  const actual = PNG.sync.read(actualBuffer);
  const reference = PNG.sync.read(readFileSync(resolve(references, `${key}.png`)));
  const scaledReference = resizeNearest(reference, actual.width, actual.height);
  const diff = new PNG({ width: actual.width, height: actual.height });
  const different = pixelmatch(
    actual.data,
    scaledReference.data,
    diff.data,
    actual.width,
    actual.height,
    { threshold: 0.2, includeAA: false },
  );
  const ratio = different / (actual.width * actual.height);
  test.info().annotations.push({
    type: 'stitch-diff',
    description: `${key}: ${(ratio * 100).toFixed(2)}%`,
  });
  await test.info().attach(`${key}-actual`, {
    body: actualBuffer,
    contentType: 'image/png',
  });
  await test.info().attach(`${key}-diff`, {
    body: PNG.sync.write(diff),
    contentType: 'image/png',
  });
  expect(ratio, `${key} diverged materially from Stitch`).toBeLessThan(0.3);
}

function resizeNearest(source: PNG, width: number, height: number) {
  const target = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(
      source.height - 1,
      Math.floor((y / height) * source.height),
    );
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(
        source.width - 1,
        Math.floor((x / width) * source.width),
      );
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

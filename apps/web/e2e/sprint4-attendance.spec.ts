import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const references = resolve(process.cwd(), "public/stitch/sprint-4");
const tenantId = "019f6987-3b0e-7010-955b-4c2f6b840702";
const employeeId = "019f6987-3b0e-7010-955b-4c2f6b840703";
const date = "2026-07-17";

test.beforeEach(async ({ page }) => {
  await mockAttendanceCapabilities(page);
  await page.route("**/workspace/modules", (route) =>
    route.fulfill({
      status: 200,
      json: { modules: [{ key: "ATTENDANCE", name: "Attendance" }] },
    }),
  );
  await page.route("**/onboarding/status", (route) =>
    route.fulfill({
      status: 200,
      json: { data: { completed: true, currentStep: 4, steps: {} } },
    }),
  );
  await page.route("**/auth/me", (route) =>
    route.fulfill({
      status: 200,
      json: {
        user: {
          id: "admin-user",
          email: "admin@acme.com",
          roles: ["BUSINESS_ADMIN"],
          permissions: [
            "attendance.records.read",
            "attendance.records.self.read",
            "attendance.exceptions.read",
            "attendance.exceptions.manage",
            "organization.employees.read",
          ],
        },
        workspace: {
          id: tenantId,
          companyName: "Acme Technologies",
          subdomain: "acme",
        },
      },
    }),
  );
  await login(page);
  await mockAttendance(page);
});

async function mockAttendanceCapabilities(page: Page) {
  await page.route("**/workspace/attendance-capabilities", (route) =>
    route.fulfill({
      json: {
        data: {
          attendanceEntitled: true,
          fieldTrackingEntitled: false,
          fieldTrackingEnabled: false,
          biometricEnforcementAvailable: true,
        },
      },
    }),
  );
}

for (const viewport of [
  { width: 2560, height: 1440 },
  { width: 1440, height: 1000 },
  { width: 1024, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`${viewport.width}px keeps H9, H10 and H13 usable`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const screen of [
      {
        key: "H9-attendance-register",
        path: "/app/attendance/register",
        heading: "Attendance Register",
      },
      {
        key: "H10-attendance-detail",
        path: `/app/attendance/register/${employeeId}?date=${date}`,
        heading: "Rajesh Kumar",
      },
      {
        key: "H13-attendance-exceptions",
        path: "/app/attendance/exceptions",
        heading: "OD & WFH Exceptions",
      },
    ]) {
      await page.goto(screen.path);
      await expect(
        page.getByRole("heading", { name: screen.heading }),
      ).toBeVisible();
      await expectNoPageOverflow(page);
      await expectNoCollapsedContent(page);
      if (viewport.width !== 390) await compareWithStitch(page, screen.key);
    }
  });
}

test("register opens the selected employee evidence timeline", async ({
  page,
}) => {
  await page.goto("/app/attendance/register");
  await expect(page.getByText("Rajesh Kumar")).toBeVisible();
  await expect(page.getByText("WEB")).toBeVisible();
  await page.getByRole("link", { name: "View", exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`/app/attendance/register/${employeeId}`),
  );
  await expect(page.getByText("Evidence timeline")).toBeVisible();
  await expect(page.getByText("CHECKIN")).toBeVisible();
  await expect(page.getByText("10.0.0.1")).toBeHidden();
});

test("exception editor warns about an overlap before submission", async ({
  page,
}) => {
  await page.goto("/app/attendance/exceptions");
  await page.getByRole("button", { name: "Add exception" }).click();
  await page
    .getByRole("combobox", { name: /Employee/ })
    .selectOption(employeeId);
  await page.getByLabel("Start date").fill(date);
  await page.getByLabel("End date").fill(date);
  await page.getByLabel("Approval reason").fill("Customer visit");
  await expect(page.getByText(/overlaps an existing/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create exception" }),
  ).toBeDisabled();
});

test("self punch card follows the server-confirmed transition", async ({
  page,
}) => {
  let open = false;
  await page.route("**/attendance/me/today", (route) =>
    route.fulfill({ status: 200, json: todayResponse(open) }),
  );
  await page.route("**/attendance/check-in", (route) => {
    open = true;
    return route.fulfill({ status: 201, json: todayResponse(true) });
  });
  await page.goto("/app");
  await expect(
    page.getByRole("region", { name: "My attendance" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Check in" }).click();
  await expect(page.getByRole("button", { name: "Check out" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Break", exact: true }),
  ).toBeVisible();
});

test("register exposes loading, empty and API error states", async ({
  page,
}) => {
  await page.route("**/attendance/register?*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return route.fulfill({
      status: 200,
      json: emptyRegister(),
    });
  });
  await page.goto("/app/attendance/register");
  await expect(page.locator(".animate-pulse").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No attendance records" }),
  ).toBeVisible();
  await page.unroute("**/attendance/register?*");
  await page.route("**/attendance/register?*", (route) =>
    route.fulfill({ status: 403, json: { code: "PERMISSION_DENIED" } }),
  );
  await page.reload();
  await expect(page.getByText(/could not be loaded/)).toBeVisible();
});

test("dashboard identifies stale attendance snapshots", async ({ page }) => {
  await page.route("**/attendance/dashboard?*", (route) =>
    route.fulfill({ status: 200, json: staleDashboardFixture() }),
  );
  await page.goto("/app");
  await expect(page.getByText(/Data may be stale/)).toBeVisible();
});

async function login(page: Page) {
  await page.goto(`/login?tenantId=${tenantId}&workspace=acme`);
  await page.getByLabel("Email Address").fill("admin@acme.com");
  await page.locator("#password").fill("TenantAdmin123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/app/);
}

async function mockAttendance(page: Page) {
  await page.route("**/attendance/register?*", (route) =>
    route.fulfill({ status: 200, json: registerFixture() }),
  );
  await page.route("**/attendance/employees/*/month?*", (route) =>
    route.fulfill({ status: 200, json: monthFixture() }),
  );
  await page.route("**/attendance/register/*/day?*", (route) =>
    route.fulfill({ status: 200, json: dayFixture() }),
  );
  await page.route("**/attendance-exceptions?*", (route) =>
    route.fulfill({ status: 200, json: exceptionFixture() }),
  );
  await page.route("**/employees?*", (route) =>
    route.fulfill({
      status: 200,
      json: {
        data: [
          { id: employeeId, employeeCode: "EMP-001", fullName: "Rajesh Kumar" },
        ],
      },
    }),
  );
}

function registerFixture() {
  return {
    data: [
      {
        id: "log-1",
        attendanceDate: date,
        employee: {
          id: employeeId,
          employeeCode: "EMP-001",
          fullName: "Rajesh Kumar",
          department: { id: "dept-1", name: "Operations" },
          designation: { id: "des-1", name: "Analyst" },
          office: { id: "office-1", officeName: "Muscat HQ" },
        },
        shift: { id: "shift-1", name: "Day shift" },
        status: "PRESENT",
        firstCheckin: `${date}T05:00:00.000Z`,
        lastCheckout: `${date}T14:00:00.000Z`,
        workMinutes: 510,
        breakMinutes: 30,
        lateMinutes: 0,
        overtimeMinutes: 0,
        earlyLeaveMinutes: 0,
        isLocked: true,
        evidence: {
          verification: { passed: 2, failed: 0 },
          sources: ["WEB"],
          hasOfflineSync: false,
          timeSuspect: false,
        },
      },
    ],
    pagination: { page: 1, limit: 25, total: 1, pages: 1 },
    summary: {
      statuses: { PRESENT: 1 },
      totals: { totalWorkMinutes: 510, lateMinutes: 0, overtimeMinutes: 0 },
    },
  };
}

function emptyRegister() {
  return {
    data: [],
    pagination: { page: 1, limit: 25, total: 0, pages: 0 },
    summary: {
      statuses: {},
      totals: { totalWorkMinutes: 0, lateMinutes: 0, overtimeMinutes: 0 },
    },
  };
}

function staleDashboardFixture() {
  return {
    data: {
      date,
      timezone: "Asia/Muscat",
      summary: {
        present: 1,
        late: 0,
        absent: 0,
        onField: 0,
        onBreak: 0,
        notYetIn: 0,
      },
      employees: [],
      attention: {
        pendingRegularizations: 0,
        openSecurityViolations: 0,
        absenteeAlerts: 0,
      },
      updatedAt: "2026-07-17T00:00:00.000Z",
      nextCursor: null,
    },
  };
}

function monthFixture() {
  return {
    data: {
      employee: {
        id: employeeId,
        employeeCode: "EMP-001",
        fullName: "Rajesh Kumar",
        department: { name: "Operations" },
        designation: { name: "Analyst" },
      },
      month: "2026-07",
      days: [
        {
          id: "log-1",
          date,
          status: "PRESENT",
          firstCheckin: `${date}T05:00:00.000Z`,
          lastCheckout: `${date}T14:00:00.000Z`,
          workMinutes: 510,
          breakMinutes: 30,
          lateMinutes: 0,
          overtimeMinutes: 0,
          earlyLeaveMinutes: 0,
          shift: { id: "shift-1", name: "Day shift" },
          finalizedAt: `${date}T18:00:00.000Z`,
          lockedAt: null,
        },
      ],
      summary: {
        days: 1,
        present: 1,
        absent: 0,
        halfDays: 0,
        lateDays: 0,
        workMinutes: 510,
        overtimeMinutes: 0,
      },
    },
  };
}

function dayFixture() {
  return {
    data: {
      ...monthFixture().data.days[0],
      employee: monthFixture().data.employee,
      isLocked: false,
      exception: null,
      timeline: [
        {
          id: "event-1",
          eventType: "CHECKIN",
          source: "WEB",
          eventTime: `${date}T05:00:00.000Z`,
          syncTime: `${date}T05:00:01.000Z`,
          isOfflineSync: false,
          timeSuspect: false,
        },
      ],
    },
  };
}

function exceptionFixture() {
  return {
    data: [
      {
        id: "exception-1",
        employeeId,
        exceptionType: "WFH",
        startDate: date,
        endDate: date,
        reason: "Approved remote support",
        employee: {
          id: employeeId,
          employeeCode: "EMP-001",
          fullName: "Rajesh Kumar",
        },
        createdAt: `${date}T00:00:00.000Z`,
        updatedAt: `${date}T00:00:00.000Z`,
      },
    ],
    pagination: { page: 1, limit: 25, total: 1, pages: 1 },
  };
}

function todayResponse(open: boolean) {
  return {
    data: {
      attendanceDate: date,
      timezone: "Asia/Muscat",
      status: open ? "PRESENT_OPEN" : "ABSENT",
      openAction: open ? "CHECKOUT" : "CHECKIN",
      canStartBreak: open,
      isLocked: false,
      totals: {
        workMinutes: open ? 5 : 0,
        breakMinutes: 0,
        overtimeMinutes: 0,
      },
      shift: { name: "Day shift", startTime: "09:00", endTime: "18:00" },
      timeline: [],
    },
    idempotent: false,
  };
}

async function expectNoPageOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

async function expectNoCollapsedContent(page: Page) {
  const collapsed = await page.evaluate(
    () =>
      Array.from(
        document.querySelectorAll<HTMLElement>('[class*="max-w-"]'),
      ).filter((element) => {
        const rect = element.getBoundingClientRect();
        return (
          getComputedStyle(element).display !== "none" &&
          rect.height > 0 &&
          rect.width < 96 &&
          (element.textContent?.trim().length ?? 0) >= 20
        );
      }).length,
  );
  expect(collapsed).toBe(0);
}

async function compareWithStitch(page: Page, key: string) {
  await page.evaluate(() => document.fonts.ready);
  const actualBuffer = await page.screenshot({
    animations: "disabled",
    fullPage: true,
  });
  const actual = PNG.sync.read(actualBuffer);
  const reference = PNG.sync.read(
    readFileSync(resolve(references, `${key}.png`)),
  );
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
    type: "stitch-diff",
    description: `${key}: ${(ratio * 100).toFixed(2)}%`,
  });
  await test.info().attach(`${key}-actual`, {
    body: actualBuffer,
    contentType: "image/png",
  });
  await test.info().attach(`${key}-diff`, {
    body: PNG.sync.write(diff),
    contentType: "image/png",
  });
  expect(
    ratio,
    `${key} diverged materially from the archived Stitch composition`,
  ).toBeLessThan(0.3);
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

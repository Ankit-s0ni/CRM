import { expect, test, type Page } from "@playwright/test";

const tenantId = "81000000-0000-4000-8000-000000000001";

const fullPermissions = [
  "workspace.modules.read",
  "workspace.settings.read",
  "organization.employees.read",
  "organization.departments.read",
  "attendance.records.read",
  "attendance.exceptions.read",
  "attendance.exceptions.manage",
  "attendance.regularizations.manage",
  "attendance.field.live.read",
  "attendance.field.routes.read",
  "attendance.reports.read",
  "attendance.reports.generate",
  "attendance.payroll-lock.manage",
  "attendance.config.read",
  "attendance.config.manage",
  "attendance.policies.read",
  "attendance.policies.manage",
  "attendance.shifts.read",
  "attendance.shifts.manage",
  "attendance.rosters.read",
  "attendance.rosters.manage",
  "attendance.offices.read",
  "attendance.offices.manage",
  "attendance.holidays.read",
  "attendance.holidays.manage",
  "attendance.devices.read",
  "attendance.devices.manage",
  "attendance.security-alerts.read",
  "attendance.security-alerts.manage",
  "billing.subscription.manage",
];

test("turns Attendance into an operational workspace with grouped navigation", async ({
  page,
}) => {
  await installTenant(page, fullPermissions);
  await mockAttendanceApis(page, fieldCapabilities());

  await page.goto("/app/modules/attendance");

  const workspace = page.getByRole("navigation", {
    name: "Attendance workspace",
  });
  for (const item of [
    "Overview",
    "Today",
    "Requests",
    "Field",
    "Reports",
    "Setup",
  ]) {
    await expect(
      workspace.getByRole("link", { name: item, exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("heading", { name: "Attendance overview" }),
  ).toBeVisible();
  await expect(page.getByText("Needs attention")).toBeVisible();
  await expect(page.getByText("Devices awaiting approval")).toBeVisible();
  await expect(page.getByText("Trust and compliance")).toHaveCount(0);

  await workspace.getByRole("link", { name: "Requests", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/attendance\/exceptions$/);
  const requests = page.getByRole("navigation", { name: "requests section" });
  await expect(requests.getByRole("link", { name: "OD & WFH" })).toBeVisible();
  await expect(
    requests.getByRole("link", { name: "Corrections" }),
  ).toBeVisible();

  await workspace.getByRole("link", { name: "Setup", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/attendance\/setup$/);
  for (const group of [
    "Rules & verification",
    "Work schedule",
    "Workplaces & calendar",
    "Trust & devices",
  ]) {
    await expect(page.getByRole("heading", { name: group })).toBeVisible();
  }
  await page.getByRole("link", { name: "Shifts", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/attendance\/shifts$/);
  await expect(
    page
      .getByRole("navigation", { name: "Attendance setup features" })
      .getByRole("link", { name: "Rosters" }),
  ).toBeVisible();
});

test("opens contextual help by keyboard and returns focus on Escape", async ({
  page,
}) => {
  await installTenant(page, fullPermissions);
  await mockAttendanceApis(page, fieldCapabilities());
  await page.goto("/app/modules/attendance");

  const trigger = page
    .getByRole("button", { name: "About Attendance overview" })
    .first();
  await trigger.focus();
  await trigger.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Attendance overview" }),
  ).toBeVisible();
  await expect(page.getByText("Use this when")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("opens help with Space without navigating its setup card", async ({
  page,
}) => {
  await installTenant(page, fullPermissions);
  await mockAttendanceApis(page, fieldCapabilities());
  await page.goto("/app/attendance/setup");

  const originalUrl = page.url();
  const trigger = page
    .getByRole("button", { name: "About Attendance policies" })
    .last();
  await trigger.focus();
  await trigger.press("Space");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(originalUrl);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("preserves overview scope and metric filters in the register URL", async ({
  page,
}) => {
  await installTenant(page, fullPermissions);
  await mockAttendanceApis(page, fieldCapabilities());
  await page.goto("/app/modules/attendance");

  await page.getByLabel("Department scope").selectOption("department-1");
  await page.getByLabel("Office scope").selectOption("office-1");
  await page.getByLabel("Operational date").fill("2026-07-17");
  await page.getByRole("link", { name: /3\s*Absent/ }).click();

  await expect(page).toHaveURL(/startDate=2026-07-17/);
  await expect(page).toHaveURL(/endDate=2026-07-17/);
  await expect(page).toHaveURL(/departmentId=department-1/);
  await expect(page).toHaveURL(/officeId=office-1/);
  await expect(page).toHaveURL(/status=ABSENT/);
  await expect(page.getByLabel("Status")).toHaveValue("ABSENT");

  await page.goto("/app/modules/attendance");
  await page.getByRole("link", { name: /2\s*Late/ }).click();
  await expect(page).toHaveURL(/lateOnly=true/);
  await expect(page.getByLabel("Status")).toHaveValue("attention:late");
});

test("keeps attention queue filters bookmarkable on each destination", async ({
  page,
}) => {
  await installTenant(page, fullPermissions);
  await mockAttendanceApis(page, fieldCapabilities());

  await page.goto("/app/attendance/exceptions?type=WFH");
  await expect(
    page.getByRole("button", { name: "Work from home" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.goto("/app/attendance/regularizations?status=APPROVED");
  await expect(page.getByLabel("Request status")).toHaveValue("APPROVED");

  await page.goto("/app/attendance/devices?status=PENDING_APPROVAL");
  await expect(
    page.getByRole("button", { name: "Pending approval" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.goto("/app/attendance/security?status=OPEN&severity=CRITICAL");
  await expect(page.getByLabel("Alert status")).toHaveValue("OPEN");
  await expect(page.getByText("CRITICAL severity · clear")).toBeVisible();
  await page.getByLabel("Alert status").selectOption("");
  await expect(page).toHaveURL(/status=ALL/);
  await expect(page.getByLabel("Alert status")).toHaveValue("");

  await page.goto("/app/attendance/field?presence=STALE");
  await expect(
    page.getByRole("button", { name: "STALE", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("hides irrelevant and unauthorized workspaces for an office manager", async ({
  page,
}) => {
  const managerPermissions = [
    "workspace.modules.read",
    "organization.employees.read",
    "attendance.records.read",
    "attendance.exceptions.read",
  ];
  await installTenant(page, managerPermissions, ["MANAGER"]);
  await mockAttendanceApis(page, officeOnlyCapabilities());
  await page.goto("/app/modules/attendance");

  const workspace = page.getByRole("navigation", {
    name: "Attendance workspace",
  });
  await expect(workspace.getByRole("link", { name: "Today" })).toBeVisible();
  await expect(workspace.getByRole("link", { name: "Requests" })).toBeVisible();
  await expect(workspace.getByRole("link", { name: "Field" })).toHaveCount(0);
  await expect(workspace.getByRole("link", { name: "Reports" })).toHaveCount(0);
  await expect(workspace.getByRole("link", { name: "Setup" })).toHaveCount(0);
  await expect(
    page.getByText("Month-end readiness", { exact: true }),
  ).toBeHidden();
});

test("blocks unauthorized direct Attendance routes", async ({ page }) => {
  const managerPermissions = [
    "workspace.modules.read",
    "organization.employees.read",
    "attendance.records.read",
    "attendance.exceptions.read",
  ];
  await installTenant(page, managerPermissions, ["MANAGER"]);
  await mockAttendanceApis(page, officeOnlyCapabilities());
  await page.goto("/app/attendance/setup");
  await expect(
    page.getByRole("heading", { name: "Attendance access denied" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Attendance setup" }),
  ).toHaveCount(0);
});

test("shows a consistent unavailable state when Attendance is disabled", async ({
  page,
}) => {
  await installTenant(page, fullPermissions);
  await mockAttendanceApis(page, fieldCapabilities());
  await page.route("http://localhost:4001/workspace/modules", (route) =>
    route.fulfill({ json: { modules: [] } }),
  );
  await page.goto("/app/modules/attendance");
  await expect(
    page.getByRole("heading", { name: "Attendance is unavailable" }),
  ).toBeVisible();
});

test("hides the HR Attendance workspace from employees", async ({ page }) => {
  const employeePermissions = [
    "workspace.modules.read",
    "attendance.records.self.read",
  ];
  await installTenant(page, employeePermissions, ["EMPLOYEE"]);
  await mockAttendanceApis(page, officeOnlyCapabilities());
  await page.goto("/app/modules");
  await expect(page.getByRole("link", { name: /Attendance/ })).toHaveCount(0);
  await page.goto("/app/modules/attendance");
  await expect(
    page.getByRole("heading", { name: "Attendance access denied" }),
  ).toBeVisible();
});

test("shows subscription guidance only to a permitted Business Admin", async ({
  page,
}) => {
  const adminPermissions = [
    "workspace.modules.read",
    "attendance.config.read",
    "attendance.config.manage",
    "billing.subscription.manage",
  ];
  await installTenant(page, adminPermissions, ["BUSINESS_ADMIN"]);
  await mockAttendanceApis(page, officeOnlyCapabilities());
  await page.goto("/app/attendance/setup");
  await expect(
    page.getByText("Field Tracking is not included in this workspace"),
  ).toBeVisible();
  await expect(
    page.getByText(/review the subscription with the DeltCRM owner/i),
  ).toBeVisible();
});

test("preserves detail deep links, breadcrumbs, and filtered return navigation", async ({
  page,
}) => {
  await installTenant(page, fullPermissions);
  await mockAttendanceApis(page, fieldCapabilities());

  const registerReturn =
    "/app/attendance/register?startDate=2026-07-18&endDate=2026-07-18&status=ABSENT";
  await page.goto(
    `/app/attendance/register/employee-1?returnTo=${encodeURIComponent(registerReturn)}`,
  );
  await expect(page.getByText("Employee day", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to attendance register" }),
  ).toHaveAttribute("href", registerReturn);

  const queueReturn = "/app/attendance/regularizations?status=APPROVED";
  await page.goto(
    `/app/attendance/regularizations/request-1?returnTo=${encodeURIComponent(queueReturn)}`,
  );
  await expect(
    page.getByText("Correction decision", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to queue" }),
  ).toHaveAttribute("href", queueReturn);

  await page.goto("/app/attendance/field");
  const routeLink = page.getByRole("link", { name: "View route" });
  await expect(routeLink).toBeVisible();
  await routeLink.click();
  await expect(page).toHaveURL(/\/app\/attendance\/field\/field-1\/route$/);
  await expect(page.getByText("Route history", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Route Playback" }),
  ).toBeVisible();
});

test("removes biometric and background-tracking controls for an office-only HR tenant", async ({
  page,
}) => {
  const hrSetupPermissions = [
    "workspace.modules.read",
    "attendance.config.read",
    "attendance.config.manage",
    "attendance.policies.read",
    "attendance.policies.manage",
  ];
  await installTenant(page, hrSetupPermissions);
  await mockAttendanceApis(page, officeOnlyCapabilities());
  await page.route("http://localhost:4001/attendance-policies", (route) =>
    route.fulfill({ json: { data: [officePolicy()] } }),
  );
  await page.route("http://localhost:4001/departments", (route) =>
    route.fulfill({ json: { data: [] } }),
  );

  await page.goto("/app/modules/attendance/capabilities");
  await expect(
    page.getByText("Location verification", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("h2", { hasText: "Selfie verification" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Office and non-tracked attendance continue normally."),
  ).toBeVisible();
  await expect(
    page.getByText("Review the workspace subscription", { exact: false }),
  ).toHaveCount(0);

  await page.goto("/app/attendance/policies");
  await page.getByRole("button", { name: "Edit rules" }).click();
  await expect(
    page.getByRole("combobox", { name: "Location verification" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Selfie verification" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Enable field tracking for FIELD employees"),
  ).toHaveCount(0);
});

test.describe("responsive Attendance workspace", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps setup and help usable without document overflow", async ({
    page,
  }) => {
    await installTenant(page, fullPermissions);
    await mockAttendanceApis(page, officeOnlyCapabilities());
    await page.goto("/app/attendance/setup");
    await expect(
      page.getByRole("heading", { name: "Attendance setup" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);

    await page
      .getByRole("button", { name: "About Attendance setup" })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });
});

for (const width of [1440, 1024, 768]) {
  test(`keeps primary Attendance workspaces usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await installTenant(page, fullPermissions);
    await mockAttendanceApis(page, fieldCapabilities());
    for (const route of [
      "/app/modules/attendance",
      "/app/attendance/requests",
      "/app/attendance/setup",
    ]) {
      await page.goto(route);
      await expect(
        page.getByRole("navigation", { name: "Attendance workspace" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        route,
      ).toBe(true);
    }
  });
}

test("captures visual regression evidence for every Attendance workspace and help", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await installTenant(page, fullPermissions);
  await mockAttendanceApis(page, fieldCapabilities());
  const workspaces = [
    ["overview", "/app/modules/attendance", "Attendance overview"],
    ["today", "/app/attendance/register", "Attendance Register"],
    ["requests", "/app/attendance/requests", "OD & WFH Exceptions"],
    ["field", "/app/attendance/field", "Field Operations"],
    ["reports", "/app/attendance/reports", "Reports center"],
    ["setup", "/app/attendance/setup", "Attendance setup"],
  ] as const;

  for (const [name, route, heading] of workspaces) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await test.info().attach(`attendance-${name}-1440`, {
      body: await page.screenshot({ animations: "disabled", fullPage: true }),
      contentType: "image/png",
    });
  }

  await page
    .getByRole("button", { name: "About Attendance setup" })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await test.info().attach("attendance-help-1440", {
    body: await page.screenshot({ animations: "disabled", fullPage: true }),
    contentType: "image/png",
  });
});

async function installTenant(
  page: Page,
  permissions: string[],
  roles = ["HR_ADMIN"],
) {
  await page.addInitScript(
    ({ id, granted, assignedRoles }) => {
      localStorage.setItem(
        "auth-storage",
        JSON.stringify({
          state: {
            user: {
              id: "81000000-0000-4000-8000-000000000011",
              email: "hr@acme.com",
              tenantId: id,
              workspace: "acme",
              companyName: "Acme Logistics",
              roles: assignedRoles,
              permissions: granted,
              logoUrl: null,
            },
            accessToken: "attendance-restructure-token",
            refreshToken: "attendance-restructure-refresh",
            pendingAuth: { tenantId: id, workspace: "acme", email: null },
          },
          version: 0,
        }),
      );
    },
    { id: tenantId, granted: permissions, assignedRoles: roles },
  );
  await page.route("http://localhost:4001/workspace/modules", (route) =>
    route.fulfill({
      json: { modules: [{ key: "ATTENDANCE", name: "Attendance" }] },
    }),
  );
  await page.route("http://localhost:4001/auth/me", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "81000000-0000-4000-8000-000000000011",
          email: "hr@acme.com",
          roles,
          permissions,
        },
        workspace: {
          id: tenantId,
          companyName: "Acme Logistics",
          subdomain: "acme",
          logoUrl: null,
        },
      },
    }),
  );
}

async function mockAttendanceApis(
  page: Page,
  capabilities: ReturnType<typeof fieldCapabilities>,
) {
  await page.route(
    "http://localhost:4001/workspace/attendance-capabilities",
    (route) => route.fulfill({ json: { data: capabilities } }),
  );
  await page.route("http://localhost:4001/attendance/dashboard?*", (route) =>
    route.fulfill({
      json: {
        data: {
          date: "2026-07-18",
          summary: { present: 21, late: 2, absent: 3, onField: 4 },
          attention: {
            pendingRegularizations: 2,
            openSecurityViolations: 1,
            absenteeAlerts: 3,
          },
          updatedAt: "2026-07-18T10:00:00.000Z",
        },
      },
    }),
  );
  await page.route("http://localhost:4001/attendance/register?*", (route) =>
    route.fulfill({ json: registerResponse(route.request().url()) }),
  );
  await page.route(
    "http://localhost:4001/attendance/employees/employee-1/month?*",
    (route) =>
      route.fulfill({
        json: {
          data: {
            employee: {
              id: "employee-1",
              employeeCode: "ACME-001",
              fullName: "Acme Employee",
              department: { name: "Operations" },
              designation: { name: "Field Executive" },
            },
            month: "2026-07",
            days: [attendanceDay()],
            summary: {
              days: 1,
              present: 1,
              absent: 0,
              halfDays: 0,
              lateDays: 0,
              workMinutes: 480,
              overtimeMinutes: 0,
            },
          },
        },
      }),
  );
  await page.route(
    "http://localhost:4001/attendance/register/employee-1/day?*",
    (route) =>
      route.fulfill({
        json: {
          data: {
            ...attendanceDay(),
            employee: {
              id: "employee-1",
              employeeCode: "ACME-001",
              fullName: "Acme Employee",
              department: { name: "Operations" },
              designation: { name: "Field Executive" },
            },
            isLocked: false,
            exception: null,
            timeline: [],
          },
        },
      }),
  );
  await page.route("http://localhost:4001/attendance-exceptions?*", (route) =>
    route.fulfill({
      json: {
        data: [],
        pagination: { page: 1, limit: 25, total: 2, pages: 1 },
      },
    }),
  );
  await page.route("http://localhost:4001/regularizations?*", (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  await page.route("http://localhost:4001/regularizations/request-1", (route) =>
    route.fulfill({
      json: {
        data: {
          id: "request-1",
          status: "APPROVED",
          reason: "Missed checkout",
          requestedCheckin: null,
          requestedCheckout: "2026-07-18T14:00:00.000Z",
          managerComments: "Verified with manager",
          employee: {
            id: "employee-1",
            employeeCode: "ACME-001",
            fullName: "Acme Employee",
          },
          attendanceLog: {
            attendanceDate: "2026-07-18",
            firstCheckin: "2026-07-18T05:00:00.000Z",
            lastCheckout: null,
            attendanceStatus: "PRESENT_OPEN",
          },
        },
      },
    }),
  );
  await page.route("http://localhost:4001/devices?*", (route) => {
    const url = new URL(route.request().url());
    const overview = url.searchParams.get("status") === "PENDING_APPROVAL";
    return route.fulfill({
      json: {
        data: overview ? [{ id: "device-1", status: "PENDING_APPROVAL" }] : [],
      },
    });
  });
  await page.route("http://localhost:4001/security-alerts?*", (route) => {
    const url = new URL(route.request().url());
    const overview = url.searchParams.get("limit") === "100";
    return route.fulfill({
      json: {
        data: overview ? [{ id: "alert-1", severity: "CRITICAL" }] : [],
        meta: { page: 1, limit: 25, total: overview ? 1 : 0, pages: 1 },
      },
    });
  });
  await page.route("http://localhost:4001/field/employees/live", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "field-1",
            employeeCode: "ACME-F01",
            fullName: "Field Employee",
            designation: "Field Executive",
            presence: "STALE",
            department: { id: "department-1", name: "Operations" },
            office: null,
            location: null,
          },
        ],
      },
    }),
  );
  await page.route("http://localhost:4001/field/stream", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route(
    "http://localhost:4001/field/employees/field-1/routes/*",
    (route) =>
      route.fulfill({
        json: {
          data: {
            employeeId: "field-1",
            routeDate: "2026-07-18",
            simplifiedPath: [],
            distanceMeters: 0,
            pingCount: 0,
            trackingGapMinutes: 0,
            stops: [],
            gaps: [],
            punches: [],
          },
        },
      }),
  );
  await page.route("http://localhost:4001/attendance-policies", (route) =>
    route.fulfill({ json: { data: [{ id: "policy-1", assignments: [{}] }] } }),
  );
  await page.route("http://localhost:4001/shifts", (route) =>
    route.fulfill({ json: { data: [{ id: "shift-1" }] } }),
  );
  await page.route("http://localhost:4001/rosters?*", (route) =>
    route.fulfill({ json: { data: [{ id: "roster-1" }] } }),
  );
  await page.route("http://localhost:4001/offices", (route) =>
    route.fulfill({
      json: { data: [{ id: "office-1", officeName: "Muscat HQ" }] },
    }),
  );
  await page.route("http://localhost:4001/departments", (route) =>
    route.fulfill({
      json: { data: [{ id: "department-1", name: "Operations" }] },
    }),
  );
  await page.route("http://localhost:4001/reports?*", (route) => {
    const overview = new URL(route.request().url()).searchParams.has("status");
    return route.fulfill({
      json: { data: overview ? [{ id: "report-1" }] : [] },
    });
  });
  await page.route("http://localhost:4001/payroll-locks", (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  await page.route("http://localhost:4001/employees?*", (route) =>
    route.fulfill({ json: { data: [] } }),
  );
}

function registerResponse(urlValue: string) {
  const url = new URL(urlValue);
  const overview = url.searchParams.get("limit") === "100";
  return {
    data: overview
      ? [{ firstCheckin: "2026-07-18T05:00:00.000Z", lastCheckout: null }]
      : [],
    pagination: {
      page: Number(url.searchParams.get("page") ?? 1),
      limit: Number(url.searchParams.get("limit") ?? 25),
      total: overview ? 25 : 0,
      pages: 1,
    },
    summary: {
      statuses: { PRESENT: 20, PRESENT_OPEN: 1, ABSENT: 3, ON_LEAVE: 1 },
      totals: {
        workMinutes: 0,
        lateMinutes: 0,
        overtimeMinutes: 0,
        fieldDistanceMeters: 0,
      },
    },
  };
}

function attendanceDay() {
  return {
    id: "attendance-log-1",
    date: "2026-07-18",
    status: "PRESENT",
    firstCheckin: "2026-07-18T05:00:00.000Z",
    lastCheckout: "2026-07-18T13:00:00.000Z",
    workMinutes: 480,
    breakMinutes: 0,
    lateMinutes: 0,
    overtimeMinutes: 0,
    earlyLeaveMinutes: 0,
    shift: { id: "shift-1", name: "Day shift" },
    finalizedAt: "2026-07-18T13:00:00.000Z",
    lockedAt: null,
  };
}

function fieldCapabilities() {
  return {
    attendanceEntitled: true,
    fieldTrackingEntitled: true,
    fieldTrackingEnabled: true,
    fieldTrackingRelevant: true,
    biometricEnforcementAvailable: true,
  };
}

function officeOnlyCapabilities() {
  return {
    attendanceEntitled: true,
    fieldTrackingEntitled: false,
    fieldTrackingEnabled: false,
    fieldTrackingRelevant: false,
    biometricEnforcementAvailable: false,
  };
}

function officePolicy() {
  return {
    id: "81000000-0000-4000-8000-000000000101",
    name: "Office location only",
    lateAfterMinutes: 15,
    halfDayAfterMinutes: 240,
    minimumWorkMinutes: 480,
    overtimeAfterMinutes: 540,
    requireFaceMatch: false,
    requireRegisteredDevice: true,
    requireGeofence: true,
    locationMode: "OFFICE_GEOFENCE",
    selfieMode: "DISABLED",
    fieldTrackingEnabled: false,
    allowHybridFieldTracking: false,
    maxOfflineSyncHours: 48,
    maxFaceAttempts: 3,
    assignments: [{ scope: "TENANT_DEFAULT" }],
  };
}

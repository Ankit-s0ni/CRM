import { expect, test } from "@playwright/test";

const tenantId = "019f6987-3b0e-7010-955b-4c2f6b840702";
const employeeId = "019f6987-3b0e-7010-955b-4c2f6b840703";
const pendingId = "019f6987-3b0e-7010-955b-4c2f6b840704";
const activeId = "019f6987-3b0e-7010-955b-4c2f6b840705";

test.beforeEach(async ({ page }) => {
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
  let devices = deviceFixtures();
  let biometricEnrolled = true;

  await page.addInitScript(
    ({ tenantId, permissions }) => {
      localStorage.setItem(
        "auth-storage",
        JSON.stringify({
          state: {
            user: {
              id: "admin-user",
              email: "admin@acme.com",
              tenantId,
              workspace: "acme",
              companyName: "Acme Logistics",
              roles: ["BUSINESS_ADMIN"],
              permissions,
            },
            accessToken: "access-token",
            refreshToken: "refresh-token",
            pendingAuth: {
              tenantId,
              workspace: "acme",
              email: "admin@acme.com",
            },
          },
          version: 0,
        }),
      );
    },
    { tenantId, permissions: permissions() },
  );

  await page.route("http://localhost:4001/workspace/status?*", (route) =>
    route.fulfill({
      json: {
        available: true,
        workspace: {
          id: tenantId,
          companyName: "Acme Logistics",
          subdomain: "acme",
        },
      },
    }),
  );
  await page.route("http://localhost:4001/auth/login", (route) =>
    route.fulfill({
      json: {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: {
          id: "admin-user",
          email: "admin@acme.com",
          tenantId,
          workspace: "acme",
          roles: ["BUSINESS_ADMIN"],
          permissions: permissions(),
        },
      },
    }),
  );
  await page.route("http://localhost:4001/auth/me", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "admin-user",
          email: "admin@acme.com",
          roles: ["BUSINESS_ADMIN"],
          permissions: permissions(),
        },
        workspace: {
          id: tenantId,
          companyName: "Acme Logistics",
          subdomain: "acme",
        },
      },
    }),
  );
  await page.route("http://localhost:4001/workspace/modules", (route) =>
    route.fulfill({ json: { modules: [{ key: "ATTENDANCE" }] } }),
  );
  await page.route("http://localhost:4001/devices?*", (route) => {
    const employeeFilter = new URL(route.request().url()).searchParams.get(
      "employeeId",
    );
    const data = employeeFilter
      ? devices.filter((device) => device.employeeId === employeeFilter)
      : devices;
    return route.fulfill({
      json: { data, meta: { page: 1, limit: 100, total: data.length } },
    });
  });
  await page.route(
    `http://localhost:4001/devices/${pendingId}/approve`,
    (route) => {
      devices = devices.map((device) =>
        device.id === pendingId
          ? { ...device, status: "ACTIVE", isPrimary: false }
          : device,
      );
      return route.fulfill({
        status: 201,
        json: { data: devices.find(({ id }) => id === pendingId) },
      });
    },
  );
  await page.route(
    `http://localhost:4001/devices/${activeId}/block`,
    (route) => {
      devices = devices.map((device) =>
        device.id === activeId
          ? { ...device, status: "BLOCKED", isPrimary: false }
          : device,
      );
      return route.fulfill({
        status: 201,
        json: { data: devices.find(({ id }) => id === activeId) },
      });
    },
  );
  await page.route(
    `http://localhost:4001/devices/${activeId}/replace`,
    (route) => {
      devices = devices.map((device) => {
        if (device.id === activeId) {
          return {
            ...device,
            status: "REPLACED",
            isPrimary: false,
            replacedByDeviceId: pendingId,
          };
        }
        if (device.id === pendingId) {
          return { ...device, status: "ACTIVE", isPrimary: true };
        }
        return device;
      });
      return route.fulfill({
        status: 201,
        json: { data: devices.find(({ id }) => id === pendingId) },
      });
    },
  );
  await page.route(
    `http://localhost:4001/employees/${employeeId}/workspace`,
    (route) => route.fulfill({ json: { data: employeeWorkspaceFixture() } }),
  );
  await page.route(
    `http://localhost:4001/face-enrollments/${employeeId}/status`,
    (route) =>
      route.fulfill({
        json: {
          data: {
            consentActive: true,
            consentPolicyVersion: "1.2",
            enrolled: biometricEnrolled,
            version: biometricEnrolled ? 1 : null,
            enrolledAt: biometricEnrolled ? "2026-07-17T08:00:00.000Z" : null,
            eligibleForFaceVerification: biometricEnrolled,
          },
        },
      }),
  );
  await page.route(
    `http://localhost:4001/face-enrollments/${employeeId}/reset`,
    (route) => {
      biometricEnrolled = false;
      return route.fulfill({ status: 201, json: { data: { reset: true } } });
    },
  );
});

test("HR approves a pending mobile registration from the device queue", async ({
  page,
}) => {
  await page.goto("/app/attendance/devices");
  await expect(
    page.getByRole("heading", { name: "Employee devices" }),
  ).toBeVisible();
  await expect(page.getByText("Pixel 10")).toBeVisible();
  await expect(
    page.getByText("PENDING APPROVAL", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByLabel("Decision reason").fill("Identity verified by HR team");
  await page.getByRole("button", { name: "Confirm approve" }).click();

  const approvedDevice = page
    .getByRole("article")
    .filter({ hasText: "Pixel 10" });
  await expect(approvedDevice).toBeVisible();
  await expect(
    approvedDevice.getByText("ACTIVE", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("PENDING APPROVAL", { exact: true })).toHaveCount(
    0,
  );
});

test("employee profile remains available when biometrics is not entitled", async ({
  page,
}) => {
  await page.route(
    `http://localhost:4001/face-enrollments/${employeeId}/status`,
    (route) =>
      route.fulfill({
        status: 403,
        json: {
          code: "MODULE_ACCESS_DENIED",
          message: "ATTENDANCE is not active for this workspace",
        },
      }),
  );

  await page.goto(`/app/employees/${employeeId}`);
  await expect(
    page.getByRole("heading", { name: "Acme Employee 01" }),
  ).toBeVisible();
  await expect(
    page.getByText("Employee details could not be loaded."),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Employee setup checklist" }),
  ).toBeVisible();
});

test("employment update omits an unchanged legacy phone", async ({ page }) => {
  let workspace = employeeWorkspaceFixture();
  workspace.employee.phone = "7367904370";
  let submitted: Record<string, unknown> = {};
  await page.route(
    `http://localhost:4001/employees/${employeeId}/workspace`,
    (route) => route.fulfill({ json: { data: workspace } }),
  );
  await page.route("http://localhost:4001/departments", (route) =>
    route.fulfill({
      json: { data: [{ id: "department", name: "Operations" }] },
    }),
  );
  await page.route("http://localhost:4001/designations?*", (route) =>
    route.fulfill({
      json: { data: [{ id: "designation", name: "Team Member" }] },
    }),
  );
  await page.route("http://localhost:4001/employees?*", (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  await page.route(
    `http://localhost:4001/employees/${employeeId}`,
    async (route) => {
      submitted = route.request().postDataJSON();
      workspace = {
        ...workspace,
        employee: {
          ...workspace.employee,
          fullName: String(submitted.fullName),
        },
      };
      await route.fulfill({ json: { data: workspace.employee } });
    },
  );

  await page.goto(`/app/employees/${employeeId}`);
  await page.getByRole("button", { name: "Edit or transfer" }).click();
  await page.getByLabel("Full name").fill("Updated Employee");
  await page.getByRole("button", { name: "Save employment change" }).click();

  await expect(
    page.getByRole("heading", { name: "Updated Employee" }),
  ).toBeVisible();
  expect(submitted.fullName).toBe("Updated Employee");
  expect(submitted.phone).toBeUndefined();
  expect(submitted.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("HR changes one employee policy from the employee workspace", async ({
  page,
}) => {
  const defaultPolicyId = "019f6987-3b0e-7010-955b-4c2f6b840710";
  const nightPolicyId = "019f6987-3b0e-7010-955b-4c2f6b840711";
  let submitted: Record<string, unknown> = {};
  await page.route("http://localhost:4001/attendance-policies", (route) =>
    route.fulfill({
      json: {
        data: [
          policyFixture(defaultPolicyId, "Default Office", []),
          policyFixture(nightPolicyId, "Night Shift", [
            { scope: "EMPLOYEE", employeeId },
          ]),
        ],
      },
    }),
  );
  await page.route("http://localhost:4001/departments", (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  await page.route("http://localhost:4001/employees?*", (route) =>
    route.fulfill({ json: { data: [employeeFixture()] } }),
  );
  await page.route(`http://localhost:4001/employees/${employeeId}`, (route) =>
    route.fulfill({ json: { data: employeeFixture() } }),
  );
  await page.route(
    `http://localhost:4001/attendance-policies/resolve?*`,
    (route) =>
      route.fulfill({
        json: {
          data: policyFixture(nightPolicyId, "Night Shift", []).data,
          resolution: { source: "EMPLOYEE" },
        },
      }),
  );
  await page.route(
    `http://localhost:4001/attendance-policies/employees/${employeeId}`,
    async (route) => {
      submitted = route.request().postDataJSON();
      await route.fulfill({
        json: { data: { employeeId, policy: { id: defaultPolicyId } } },
      });
    },
  );

  await page.goto(`/app/employees/${employeeId}?tab=assignments`);
  await page.getByRole("link", { name: "Change this employee's policy" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Attendance policy · Acme Employee 01",
    }),
  ).toBeVisible();
  await page.getByLabel("Default Office").check();
  await page.getByRole("button", { name: "Save employee policy" }).click();

  expect(submitted).toEqual({ policyId: defaultPolicyId });
  await expect(page).toHaveURL(
    new RegExp(`/app/employees/${employeeId}\\?tab=assignments`),
  );
  await expect(
    page.getByRole("button", { name: "Assignments" }),
  ).toHaveAttribute("aria-current", "page");
});

test("HR blocks an active employee device with an audited reason", async ({
  page,
}) => {
  await page.goto(`/app/employees/${employeeId}`);
  await page
    .getByRole("button", { name: "Devices & biometrics" })
    .click();
  const activeDevice = page
    .getByRole("article")
    .filter({ hasText: "iPhone 17" });

  await activeDevice.getByRole("button", { name: "Block" }).click();
  await page
    .getByLabel("Decision reason")
    .fill("Employee reported this phone as lost");
  await page.getByRole("button", { name: "Confirm block" }).click();

  await expect(
    activeDevice.getByText("BLOCKED", { exact: true }),
  ).toBeVisible();
});

test("HR replaces the primary device with a pending registration", async ({
  page,
}) => {
  await page.goto(`/app/employees/${employeeId}`);
  await page
    .getByRole("button", { name: "Devices & biometrics" })
    .click();
  const activeDevice = page
    .getByRole("article")
    .filter({ hasText: "iPhone 17" });
  const pendingDevice = page
    .getByRole("article")
    .filter({ hasText: "Pixel 10" });

  await activeDevice.getByRole("button", { name: "Replace" }).click();
  await expect(page.getByLabel("Replacement device")).toHaveValue(pendingId);
  await page
    .getByLabel("Decision reason")
    .fill("Employee completed replacement identity review");
  await page.getByRole("button", { name: "Confirm replace" }).click();

  await expect(
    activeDevice.getByText("REPLACED", { exact: true }),
  ).toBeVisible();
  await expect(
    pendingDevice.getByText("ACTIVE", { exact: true }),
  ).toBeVisible();
  await expect(
    pendingDevice.getByText("Primary", { exact: true }),
  ).toBeVisible();
});

test("employee profile exposes device controls and HR can reset face enrollment", async ({
  page,
}) => {
  await page.goto(`/app/employees/${employeeId}`);
  await expect(
    page.getByRole("heading", { name: "Acme Employee 01" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Devices & biometrics" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Registered devices" }),
  ).toBeVisible();
  await expect(page.getByText("Biometric identity")).toBeVisible();
  await expect(page.getByText("Enrolled · v1")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Block" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reset face profile" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Reset face profile" }).click();
  await page
    .getByLabel("Reset reason")
    .fill("Employee identity must be enrolled again");
  await page.getByRole("button", { name: "Reset profile" }).click();

  await expect(page.getByText("Not enrolled", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Attendance eligible").locator(".."),
  ).toContainText("No");
  await expect(
    page.getByRole("button", { name: "Reset face profile" }),
  ).toHaveCount(0);
});

test("device queue remains usable on a compact HR viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/attendance/devices");
  await expect(
    page.getByRole("heading", { name: "Employee devices" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

function permissions() {
  return [
    "organization.employees.read",
    "organization.employees.update",
    "attendance.policies.read",
    "attendance.policies.manage",
    "attendance.config.read",
    "attendance.devices.read",
    "attendance.devices.manage",
    "attendance.biometrics.read",
    "attendance.biometrics.manage",
  ];
}

function deviceFixtures() {
  const employee = {
    id: employeeId,
    employeeCode: "ACME-001",
    fullName: "Acme Employee 01",
  };
  return [
    {
      id: pendingId,
      employeeId,
      deviceUuid: "50000000-0000-4000-8000-000000000099",
      platform: "ANDROID",
      deviceModel: "Pixel 10",
      osVersion: "16",
      appVersion: "1.0.0",
      status: "PENDING_APPROVAL",
      isPrimary: false,
      replacedByDeviceId: null as string | null,
      registeredAt: "2026-07-17T08:00:00.000Z",
      lastSeenAt: "2026-07-17T08:05:00.000Z",
      employee,
    },
    {
      id: activeId,
      employeeId,
      deviceUuid: "50000000-0000-4000-8000-000000000098",
      platform: "IOS",
      deviceModel: "iPhone 17",
      osVersion: "19",
      appVersion: "1.0.0",
      status: "ACTIVE",
      isPrimary: true,
      replacedByDeviceId: null as string | null,
      registeredAt: "2026-07-16T08:00:00.000Z",
      lastSeenAt: "2026-07-17T08:04:00.000Z",
      employee,
    },
  ];
}

function employeeFixture() {
  return {
    id: employeeId,
    employeeCode: "ACME-001",
    fullName: "Acme Employee 01",
    phone: "+96890000001",
    workType: "OFFICE",
    status: "ACTIVE",
    dateOfJoining: "2026-01-01T00:00:00.000Z",
    dateOfExit: null,
    department: { id: "department", name: "Operations" },
    designation: { id: "designation", name: "Team Member" },
    manager: null,
    _count: { reports: 0 },
  };
}

function employeeWorkspaceFixture() {
  return {
    employee: { ...employeeFixture(), user: null },
    assignments: {
      offices: [],
      defaultShift: null,
      upcomingRosters: [],
      effectiveAttendancePolicy: null,
      policyResolution: null,
    },
    attendance: { recentDays: [], resolvedExceptionCount: 0 },
    leave: { balances: [], recentRequests: [] },
    devices: [],
    history: { employmentEvents: [], audit: [] },
    readiness: {
      profileComplete: true,
      officeAssigned: false,
      shiftAssigned: false,
      attendancePolicyResolved: false,
      accountLinked: false,
      deviceApproved: true,
    },
  };
}

function policyFixture(
  id: string,
  name: string,
  assignments: Array<{ scope: "EMPLOYEE"; employeeId: string }>,
) {
  return {
    id,
    name,
    lateAfterMinutes: 15,
    halfDayAfterMinutes: 240,
    minimumWorkMinutes: 480,
    overtimeAfterMinutes: 540,
    requireFaceMatch: false,
    requireRegisteredDevice: false,
    requireGeofence: false,
    locationMode: "NONE",
    selfieMode: "DISABLED",
    fieldTrackingEnabled: false,
    allowHybridFieldTracking: false,
    maxOfflineSyncHours: 48,
    maxFaceAttempts: 3,
    assignments,
    data: { id, name },
  };
}

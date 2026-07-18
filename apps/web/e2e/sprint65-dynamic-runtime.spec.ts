import { expect, test, type Page } from "@playwright/test";

const tenantId = "65000000-0000-4000-8000-000000000001";
const policy = {
  id: "65000000-0000-4000-8000-000000000101",
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

test.beforeEach(async ({ page }) => {
  await installAuthenticatedTenant(page);
  await page.route("**/workspace/modules", (route) =>
    route.fulfill({
      status: 200,
      json: { modules: [{ key: "ATTENDANCE", name: "Attendance" }] },
    }),
  );
  await page.route("**/auth/me", (route) =>
    route.fulfill({
      status: 200,
      json: {
        user: {
          id: "65000000-0000-4000-8000-000000000011",
          email: "admin@dubai-office.test",
          roles: ["BUSINESS_ADMIN"],
          permissions: permissions(),
        },
        workspace: {
          id: tenantId,
          companyName: "Dubai Office LLC",
          subdomain: "dubai-office",
          logoUrl: null,
        },
      },
    }),
  );
});

test("keeps attendance configuration inside Modules and applies a location-only policy", async ({ page }) => {
  let submittedPolicy: Record<string, unknown> | undefined;
  await mockPolicyDependencies(page, (payload) => {
    submittedPolicy = payload;
  });
  await page.route("**/workspace/attendance-capabilities", (route) =>
    route.fulfill({
      status: 200,
      json: {
        data: {
          attendanceEntitled: true,
          fieldTrackingEntitled: true,
          fieldTrackingEnabled: false,
          fieldTrackingIntervalMin: 15,
          biometricEnforcementAvailable: true,
          runtimeConfigVersion: 12,
        },
      },
    }),
  );

  await page.goto("/app/modules");
  await page.getByRole("link", { name: "Attendance", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/modules\/attendance$/);
  await page.getByRole("link", { name: /Employee app behavior/ }).click();
  await expect(page).toHaveURL(/\/app\/modules\/attendance\/capabilities$/);
  await expect(page.getByText("Location-only supported")).toBeVisible();
  await expect(page.getByText("Dubai Office LLC")).toBeVisible();

  await page.goto("/app/attendance/policies");
  await page.getByRole("button", { name: "Edit rules" }).click();
  await page.getByLabel("Location verification").selectOption("OFFICE_GEOFENCE");
  await page.getByLabel("Selfie verification").selectOption("DISABLED");
  await page.getByRole("button", { name: "Save rules" }).click();
  await expect.poll(() => submittedPolicy).toMatchObject({
    locationMode: "OFFICE_GEOFENCE",
    selfieMode: "DISABLED",
    fieldTrackingEnabled: false,
  });
});

test("locks field tracking when the platform entitlement is absent", async ({ page }) => {
  await page.route("**/attendance-policies", (route) =>
    route.fulfill({ status: 200, json: { data: [policy] } }),
  );
  await page.route("**/workspace/attendance-capabilities", (route) =>
    route.fulfill({
      status: 200,
      json: {
        data: {
          attendanceEntitled: true,
          fieldTrackingEntitled: false,
          fieldTrackingEnabled: false,
          fieldTrackingIntervalMin: 15,
          biometricEnforcementAvailable: true,
          runtimeConfigVersion: 12,
        },
      },
    }),
  );

  await page.goto("/app/modules/attendance/capabilities");
  await expect(page.getByText("Not included for this workspace")).toBeVisible();
  await expect(page.getByLabel("Allow field tracking")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save capabilities" })).toBeDisabled();
});

test.describe("mobile-width capability administration", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("remains usable without horizontal overflow", async ({ page }) => {
    await page.route("**/attendance-policies", (route) =>
      route.fulfill({ status: 200, json: { data: [policy] } }),
    );
    await page.route("**/workspace/attendance-capabilities", (route) =>
      route.fulfill({
        status: 200,
        json: {
          data: {
            attendanceEntitled: true,
            fieldTrackingEntitled: false,
            fieldTrackingEnabled: false,
            fieldTrackingIntervalMin: 15,
            biometricEnforcementAvailable: true,
            runtimeConfigVersion: 12,
          },
        },
      }),
    );
    await page.goto("/app/modules/attendance/capabilities");
    await expect(page.getByRole("heading", { name: "Employee app behavior" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
});

async function installAuthenticatedTenant(page: Page) {
  await page.addInitScript(({ id, granted }) => {
    localStorage.setItem(
      "auth-storage",
      JSON.stringify({
        state: {
          user: {
            id: "65000000-0000-4000-8000-000000000011",
            email: "admin@dubai-office.test",
            tenantId: id,
            workspace: "dubai-office",
            companyName: "Dubai Office LLC",
            roles: ["BUSINESS_ADMIN"],
            permissions: granted,
            logoUrl: null,
          },
          accessToken: "sprint65-access-token",
          refreshToken: "sprint65-refresh-token",
          pendingAuth: { tenantId: id, workspace: "dubai-office", email: null },
        },
        version: 0,
      }),
    );
  }, { id: tenantId, granted: permissions() });
}

async function mockPolicyDependencies(
  page: Page,
  onPatch: (payload: Record<string, unknown>) => void,
) {
  await page.route("**/attendance-policies", (route) =>
    route.fulfill({ status: 200, json: { data: [policy] } }),
  );
  await page.route("**/attendance-policies/*", (route) => {
    if (route.request().method() === "PATCH") {
      onPatch(route.request().postDataJSON() as Record<string, unknown>);
    }
    return route.fulfill({ status: 200, json: { data: policy } });
  });
  await page.route("**/departments", (route) =>
    route.fulfill({ status: 200, json: { data: [] } }),
  );
  await page.route("**/employees?*", (route) =>
    route.fulfill({ status: 200, json: { data: [] } }),
  );
}

function permissions() {
  return [
    "workspace.modules.read",
    "workspace.settings.read",
    "organization.employees.read",
    "attendance.config.read",
    "attendance.config.manage",
  ];
}

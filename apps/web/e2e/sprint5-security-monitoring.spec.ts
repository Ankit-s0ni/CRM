import { expect, test } from "@playwright/test";

const tenantId = "019f6987-3b0e-7010-955b-4c2f6b840702";
const alertId = "019f6987-3b0e-7010-955b-4c2f6b840710";
const deviceId = "019f6987-3b0e-7010-955b-4c2f6b840711";

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
  let alert = alertFixture();

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
  await page.route("http://localhost:4001/security-alerts?*", (route) => {
    const query = new URL(route.request().url()).searchParams;
    const matchesStatus =
      !query.get("status") || query.get("status") === alert.status;
    const matchesType =
      !query.get("alertType") || query.get("alertType") === alert.alertType;
    const data = matchesStatus && matchesType ? [alert] : [];
    return route.fulfill({
      json: {
        data,
        meta: { page: 1, limit: 25, total: data.length, pages: 1 },
      },
    });
  });
  await page.route(
    `http://localhost:4001/security-alerts/${alertId}/evidence`,
    (route) =>
      route.fulfill({
        json: {
          data: {
            mapPoint: {
              latitude: 23.588,
              longitude: 58.3829,
              accuracyMeters: 8,
            },
            distanceMeters: 2100,
            scoreCategory: null,
            selfie: {
              url: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
              expiresIn: 60,
            },
          },
        },
      }),
  );
  await page.route(`http://localhost:4001/devices/${deviceId}/block`, (route) =>
    route.fulfill({
      status: 201,
      json: { data: { id: deviceId, status: "BLOCKED" } },
    }),
  );
  for (const action of ["acknowledge", "resolve", "dismiss"] as const) {
    await page.route(
      `http://localhost:4001/security-alerts/${alertId}/${action}`,
      (route) => {
        alert = {
          ...alert,
          status:
            action === "acknowledge"
              ? "ACKNOWLEDGED"
              : action === "resolve"
                ? "RESOLVED"
                : "DISMISSED",
        };
        return route.fulfill({ status: 201, json: { data: alert } });
      },
    );
  }
});

test("H14 authorizes private evidence and blocks the implicated device", async ({
  page,
}) => {
  await page.goto("/app/attendance/security");
  await expect(
    page.getByRole("heading", { name: "Security Monitoring Feed" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View verification log" }).click();

  await expect(
    page
      .getByRole("complementary")
      .getByRole("heading", { name: "Rooted device detected" }),
  ).toBeVisible();
  await expect(
    page.getByAltText("Authorized attendance attempt evidence"),
  ).toBeVisible();
  await expect(
    page.getByText("Private evidence link expires in 60 seconds."),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary").getByText("2.1 km FROM APPROVED ZONE"),
  ).toBeVisible();

  page.once("dialog", (dialog) =>
    dialog.accept("Root access detected during attendance"),
  );
  const blockRequest = page.waitForRequest(
    (request) =>
      request.url() === `http://localhost:4001/devices/${deviceId}/block` &&
      request.method() === "POST",
  );
  await page.getByRole("button", { name: "Block device" }).last().click();
  expect((await blockRequest).postDataJSON()).toEqual({
    reason: "Root access detected during attendance",
  });
  await expect(
    page
      .getByRole("complementary")
      .filter({ hasText: "Verification evidence" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Rooted device detected" }),
  ).toBeVisible();
});

test("H14 applies event filters", async ({ page }) => {
  await page.goto("/app/attendance/security");
  await page.getByRole("button", { name: "Mock location" }).click();
  await expect(
    page.getByRole("heading", { name: "No matching security events" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /All events/ }).click();
  await expect(
    page.getByRole("heading", { name: "Rooted device detected" }),
  ).toBeVisible();
});

for (const action of ["Acknowledge", "Resolve", "Dismiss"] as const) {
  test(`H14 can ${action.toLowerCase()} an open alert with a note`, async ({
    page,
  }) => {
    await page.goto("/app/attendance/security");
    await page.getByRole("button", { name: "View verification log" }).click();
    page.once("dialog", (dialog) => dialog.accept(`${action} after HR review`));
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "No matching security events" }),
    ).toBeVisible();
  });
}

function permissions() {
  return [
    "attendance.security-alerts.read",
    "attendance.security-alerts.manage",
    "attendance.verification.read",
    "attendance.devices.manage",
  ];
}

function alertFixture() {
  return {
    id: alertId,
    employeeId: "019f6987-3b0e-7010-955b-4c2f6b840703",
    verificationLogId: "019f6987-3b0e-7010-955b-4c2f6b840712",
    alertType: "ROOTED_DEVICE",
    severity: "CRITICAL",
    title: "Rooted device detected",
    details: {
      code: "ROOTED_DEVICE",
      mapPoint: { latitude: 23.588, longitude: 58.3829, accuracyMeters: 8 },
      distanceMeters: 2100,
      hasSelfieEvidence: true,
      deviceId,
    },
    status: "OPEN",
    acknowledgedAt: null,
    resolvedAt: null,
    resolutionNote: null,
    createdAt: "2026-07-17T08:00:00.000Z",
    employee: {
      id: "019f6987-3b0e-7010-955b-4c2f6b840703",
      employeeCode: "ACME-001",
      fullName: "Acme Employee 01",
      department: { id: "department", name: "Operations" },
    },
  };
}

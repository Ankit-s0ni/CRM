import { expect, test, type Page } from "@playwright/test";

const tenantId = "70000000-0000-4000-8000-000000000001";
const requestId = "70000000-0000-4000-8000-000000000101";
const policyId = "70000000-0000-4000-8000-000000000201";
const exportId = "70000000-0000-4000-8000-000000000301";

test.beforeEach(async ({ page }) => {
  await authenticate(page);
  await page.route("**/workspace/modules", (route) =>
    route.fulfill({
      json: {
        modules: [
          { key: "ATTENDANCE", name: "Attendance" },
          { key: "REGULARIZATION", name: "Regularization" },
          { key: "LEAVE", name: "Leave" },
          { key: "REPORTING", name: "Reporting" },
          { key: "PAYROLL_LOCK", name: "Payroll lock" },
        ],
      },
    }),
  );
  await page.route("**/auth/me", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "70000000-0000-4000-8000-000000000011",
          email: "admin@acme.com",
          roles: ["BUSINESS_ADMIN"],
          permissions: permissions(),
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
});

test("reviews and approves an attendance correction", async ({ page }) => {
  let approvedComment = "";
  await page.route("**/regularizations?*", (route) =>
    route.fulfill({ json: { data: [regularization("PENDING")] } }),
  );
  await page.route(`**/regularizations/${requestId}`, (route) =>
    route.fulfill({ json: { data: regularization(approvedComment ? "APPROVED" : "PENDING") } }),
  );
  await page.route(`**/regularizations/${requestId}/approve`, async (route) => {
    approvedComment = (route.request().postDataJSON() as { comment: string }).comment;
    await route.fulfill({ json: { data: regularization("APPROVED") } });
  });
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/app/attendance/regularizations");
  await expect(page.getByText("Aisha Employee")).toBeVisible();
  await page.getByText("Aisha Employee").click();
  await expect(page.getByRole("heading", { name: "Correction decision" })).toBeVisible();
  await page.getByLabel("Audit comment").fill("Evidence confirms the missed checkout.");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect.poll(() => approvedComment).toBe("Evidence confirms the missed checkout.");
});

test("generates reports and presents an eligible payroll export", async ({ page }) => {
  let generated = false;
  await page.route("**/reports?page=1&limit=100", (route) =>
    route.fulfill({
      json: {
        data: generated
          ? [{ ...payrollExport(), reportType: "MUSTER" }]
          : [],
      },
    }),
  );
  await page.route("**/reports/muster", async (route) => {
    generated = true;
    await route.fulfill({ json: { data: { ...payrollExport(), reportType: "MUSTER" } } });
  });
  await page.route("**/reports?reportType=PAYROLL&status=COMPLETED&page=1&limit=100", (route) =>
    route.fulfill({ json: { data: [payrollExport()] } }),
  );
  await page.route("**/payroll-locks", (route) =>
    route.fulfill({ json: { data: [] } }),
  );

  await page.goto("/app/attendance/reports");
  await expect(page.getByRole("heading", { name: "Reports center" })).toBeVisible();
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.getByRole("button", { name: "Download" })).toBeEnabled();

  await page.goto("/app/attendance/payroll");
  await expect(page.getByRole("heading", { name: "Payroll close" })).toBeVisible();
  await page.getByLabel("Completed payroll export").selectOption(exportId);
  await expect(page.getByRole("button", { name: "Lock month" })).toBeEnabled();
});

test("shows leave balances, approval queue, and notification inbox without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/leave-balances/me", (route) =>
    route.fulfill({ json: { data: [{ id: "balance-1", remainingDays: 18.5, policy: leavePolicy() }] } }),
  );
  await page.route("**/leave-policies", (route) =>
    route.fulfill({ json: { data: [leavePolicy()] } }),
  );
  await page.route("**/leave-requests?*", (route) =>
    route.fulfill({ json: { data: [leaveRequest()] } }),
  );
  await page.route("**/notifications?*", (route) =>
    route.fulfill({
      json: {
        data: [{
          id: "70000000-0000-4000-8000-000000000401",
          eventKey: "leave.approved",
          severity: "INFO",
          title: "Leave approved",
          body: "Your annual leave request was approved.",
          actionUrl: null,
          isRead: false,
          createdAt: "2026-07-18T08:00:00.000Z",
        }],
      },
    }),
  );

  await page.goto("/app/leave");
  await expect(page.getByText("18.5")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  await page.goto("/app/leave/approvals");
  await expect(page.getByText("Aisha Employee")).toBeVisible();

  await page.goto("/app/notifications");
  await expect(page.getByText("Leave approved")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

async function authenticate(page: Page) {
  await page.addInitScript(({ id, granted }) => {
    localStorage.setItem(
      "auth-storage",
      JSON.stringify({
        state: {
          user: {
            id: "70000000-0000-4000-8000-000000000011",
            email: "admin@acme.com",
            tenantId: id,
            workspace: "acme",
            companyName: "Acme Logistics",
            roles: ["BUSINESS_ADMIN"],
            permissions: granted,
            logoUrl: null,
          },
          accessToken: "sprint7-access-token",
          refreshToken: "sprint7-refresh-token",
          pendingAuth: { tenantId: id, workspace: "acme", email: null },
        },
        version: 0,
      }),
    );
  }, { id: tenantId, granted: permissions() });
}

function permissions() {
  return [
    "workspace.modules.read",
    "workspace.settings.read",
    "organization.employees.read",
    "attendance.regularizations.manage",
    "attendance.approvals.manage",
    "attendance.reports.generate",
    "attendance.reports.read",
    "attendance.payroll-lock.manage",
    "leave.self",
    "leave.approve",
    "leave.manage",
  ];
}

function regularization(status: "PENDING" | "APPROVED") {
  return {
    id: requestId,
    status,
    reason: "Device lost connectivity before checkout.",
    requestedCheckin: null,
    requestedCheckout: "2026-07-16T14:00:00.000Z",
    managerComments: status === "APPROVED" ? "Evidence confirms the missed checkout." : null,
    createdAt: "2026-07-17T08:00:00.000Z",
    employee: { id: "employee-1", employeeCode: "ACME-001", fullName: "Aisha Employee" },
    attendanceLog: {
      attendanceDate: "2026-07-16",
      firstCheckin: "2026-07-16T05:00:00.000Z",
      lastCheckout: null,
      attendanceStatus: "INCOMPLETE",
    },
  };
}

function payrollExport() {
  return {
    id: exportId,
    reportType: "PAYROLL",
    period: "2026-07",
    status: "COMPLETED",
    checksum: "a1b2c3d4e5f678901234567890abcdef",
    createdAt: "2026-07-18T08:00:00.000Z",
    completedAt: "2026-07-18T08:01:00.000Z",
  };
}

function leavePolicy() {
  return { id: policyId, name: "Annual leave", leaveType: "ANNUAL", isActive: true };
}

function leaveRequest() {
  return {
    id: "70000000-0000-4000-8000-000000000501",
    employeeId: "employee-1",
    status: "PENDING",
    startDate: "2026-07-20",
    endDate: "2026-07-20",
    halfDayStart: true,
    halfDayEnd: false,
    totalDays: 0.5,
    reason: "Medical appointment",
    employee: { id: "employee-1", employeeCode: "ACME-001", fullName: "Aisha Employee" },
    policy: leavePolicy(),
  };
}

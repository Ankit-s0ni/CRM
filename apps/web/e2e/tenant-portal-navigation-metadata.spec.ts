import { expect, test } from "@playwright/test";
import { portalHelpEntryForPath } from "../src/content/portal-help";
import {
  canViewTenantNavItem,
  tenantContextNavigation,
  tenantNavigationContext,
  tenantPrimaryNavigation,
  tenantTopLevelActive,
} from "../src/lib/tenant-navigation";
import {
  HRMS_ATTENDANCE_ROOT,
  HRMS_PAYROLL_ROOT,
} from "../src/lib/hrms-route-contract";

const adminPermissions = new Set([
  "workspace.modules.read",
  "workspace.settings.read",
  "organization.employees.read",
  "organization.departments.read",
  "organization.imports.read",
  "identity.roles.read",
  "attendance.records.read",
  "attendance.config.read",
  "attendance.reports.read",
  "attendance.payroll-lock.manage",
  "leave.manage",
  "billing.subscription.read",
  "workspace.audit.read",
  "notifications.self",
]);

test("promotes enabled product modules into primary navigation", () => {
  expect(tenantPrimaryNavigation.map(({ label }) => label)).toEqual([
    "Dashboard",
    "Employees",
    "Attendance",
    "Payroll",
    "Reports",
    "Settings",
  ]);

  expect(tenantNavigationContext("/app/employees/employee-1")).toBe(
    "employees",
  );
  expect(tenantNavigationContext(`${HRMS_ATTENDANCE_ROOT}/register`)).toBe(
    "modules",
  );
  expect(tenantNavigationContext("/app/reports/attendance")).toBe("reports");
  expect(tenantNavigationContext("/app/settings/access")).toBe("settings");
  expect(tenantTopLevelActive("/app/reports/attendance", "/app/reports")).toBe(
    true,
  );
  expect(
    tenantTopLevelActive(
      `${HRMS_ATTENDANCE_ROOT}/register`,
      HRMS_ATTENDANCE_ROOT,
    ),
  ).toBe(true);
  expect(
    tenantTopLevelActive(HRMS_PAYROLL_ROOT, HRMS_PAYROLL_ROOT),
  ).toBe(true);
});

test("keeps settings contextual navigation separate from product modules", () => {
  const moduleKeys = new Set(["ATTENDANCE", "LEAVE", "PAYROLL"]);
  const visibleSettings = tenantContextNavigation.settings
    .filter((item) => canViewTenantNavItem(item, adminPermissions, moduleKeys))
    .map(({ label }) => label);

  expect(visibleSettings).toEqual([
    "Settings home",
    "Company",
    "Admin access",
    "Security",
    "Notifications",
    "Integrations",
    "Audit history",
    "Billing",
  ]);

  expect(tenantContextNavigation.modules).toEqual([]);
});

test("shows each primary module only when its entitlement is enabled", () => {
  const attendanceItem = tenantPrimaryNavigation.find(
    ({ href }) => href === HRMS_ATTENDANCE_ROOT,
  )!;
  const payrollItem = tenantPrimaryNavigation.find(
    ({ href }) => href === HRMS_PAYROLL_ROOT,
  )!;

  expect(
    canViewTenantNavItem(
      attendanceItem,
      adminPermissions,
      new Set(["ATTENDANCE"]),
    ),
  ).toBe(true);
  expect(
    canViewTenantNavItem(attendanceItem, adminPermissions, new Set(["PAYROLL"])),
  ).toBe(false);
  expect(
    canViewTenantNavItem(payrollItem, adminPermissions, new Set(["PAYROLL"])),
  ).toBe(true);
  expect(
    canViewTenantNavItem(payrollItem, adminPermissions, new Set()),
  ).toBe(false);
});

test("keeps module routes independently highlighted", () => {
  expect(
    tenantTopLevelActive(
      HRMS_ATTENDANCE_ROOT,
      HRMS_ATTENDANCE_ROOT,
    ),
  ).toBe(true);
  expect(
    tenantTopLevelActive(
      HRMS_ATTENDANCE_ROOT,
      HRMS_PAYROLL_ROOT,
    ),
  ).toBe(false);
  expect(
    tenantTopLevelActive(
      `${HRMS_ATTENDANCE_ROOT}/leave`,
      HRMS_ATTENDANCE_ROOT,
    ),
  ).toBe(true);
});

test("connects every major portal area to plain-language contextual help", () => {
  const routes = [
    "/app",
    "/app/employees",
    "/app/employees/employee-1",
    "/app/employees/organization",
    "/app/employees/import",
    "/app/modules",
    "/app/modules/leave",
    HRMS_PAYROLL_ROOT,
    "/app/reports",
    "/app/reports/payroll",
    "/app/settings",
    "/app/settings/payroll",
    "/app/settings/security",
    "/app/settings/notifications",
    "/app/settings/integrations",
    "/app/settings/access",
    "/app/settings/billing",
  ];

  for (const route of routes) {
    const entry = portalHelpEntryForPath(route);
    expect(entry.title, route).not.toBe("");
    expect(entry.summary, route).not.toBe("");
    expect(entry.useWhen, route).not.toBe("");
    expect(entry.steps.length, route).toBeGreaterThan(0);
    expect(entry.access, route).not.toBe("");
    expect(entry.effect, route).not.toBe("");
  }
});

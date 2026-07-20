import { expect, test } from "@playwright/test";
import { portalHelpEntryForPath } from "../src/content/portal-help";
import {
  canViewTenantNavItem,
  tenantContextNavigation,
  tenantNavigationContext,
  tenantPrimaryNavigation,
  tenantTopLevelActive,
} from "../src/lib/tenant-navigation";

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

test("keeps the tenant portal organized into five primary workspaces", () => {
  expect(tenantPrimaryNavigation.map(({ label }) => label)).toEqual([
    "Dashboard",
    "Employees",
    "Modules",
    "Reports",
    "Settings",
  ]);

  expect(tenantNavigationContext("/app/employees/employee-1")).toBe(
    "employees",
  );
  expect(tenantNavigationContext("/app/attendance/register")).toBe("modules");
  expect(tenantNavigationContext("/app/reports/attendance")).toBe("reports");
  expect(tenantNavigationContext("/app/settings/access")).toBe("settings");
  expect(tenantTopLevelActive("/app/reports/attendance", "/app/reports")).toBe(
    true,
  );
});

test("filters contextual navigation by permission and module entitlement", () => {
  const moduleKeys = new Set(["ATTENDANCE", "LEAVE", "PAYROLL"]);
  const visibleSettings = tenantContextNavigation.settings
    .filter((item) => canViewTenantNavItem(item, adminPermissions, moduleKeys))
    .map(({ label }) => label);

  expect(visibleSettings).toEqual([
    "Settings home",
    "Company",
    "Organization",
    "Users & roles",
    "Modules",
    "Attendance",
    "Leave",
    "Payroll",
    "Security",
    "Notifications",
    "Integrations",
    "Audit history",
    "Billing",
  ]);

  const noAttendance = new Set(["LEAVE"]);
  expect(
    tenantContextNavigation.modules
      .filter((item) =>
        canViewTenantNavItem(item, adminPermissions, noAttendance),
      )
      .map(({ label }) => label),
  ).toEqual(["All modules", "Leave"]);
});

test("keeps modules available when a non-Attendance module is entitled", () => {
  const moduleItem = tenantPrimaryNavigation.find(
    ({ href }) => href === "/app/modules",
  )!;

  expect(
    canViewTenantNavItem(moduleItem, adminPermissions, new Set(["LEAVE"])),
  ).toBe(true);
  expect(canViewTenantNavItem(moduleItem, adminPermissions, new Set())).toBe(
    false,
  );
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
    "/app/modules/payroll",
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

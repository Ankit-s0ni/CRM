import { expect, test } from "@playwright/test";
import {
  payrollFoundationTabKeysForPermissions,
  payrollFoundationTabs,
} from "../src/features/products/payroll/payroll-foundation-workspace";
import {
  canViewTenantNavItem,
  tenantContextNavigation,
} from "../src/lib/tenant-navigation";

const payrollAdmin = [
  "payroll.settings.read",
  "payroll.settings.manage",
  "payroll.policies.read",
  "payroll.policies.manage",
  "payroll.components.read",
  "payroll.components.manage",
  "payroll.structures.read",
  "payroll.structures.manage",
  "payroll.compensation.read",
  "payroll.compensation.manage",
  "payroll.protected-data.read",
  "payroll.protected-data.manage",
  "payroll.accounting.read",
  "payroll.accounting.manage",
  "payroll.audit.read",
];

test("exposes every Payroll Phase 1 workspace tab to a Payroll admin", () => {
  expect(payrollFoundationTabKeysForPermissions(payrollAdmin)).toEqual(
    payrollFoundationTabs.map((tab) => tab.key),
  );
});

test("hides protected-data tabs without the dedicated permission", () => {
  const visible = payrollFoundationTabKeysForPermissions(
    payrollAdmin.filter((permission) => !permission.includes("protected-data")),
  );

  expect(visible).not.toContain("payment-details");
  expect(visible).not.toContain("statutory-details");
  expect(visible).toContain("compensation");
});

test("gates Payroll navigation by PAYROLL entitlement and Payroll permissions", () => {
  const payrollNav = tenantContextNavigation.modules.find(
    (item) => item.href === "/app/modules/payroll",
  )!;

  expect(
    canViewTenantNavItem(
      payrollNav,
      new Set(["payroll.settings.read"]),
      new Set(["PAYROLL"]),
    ),
  ).toBe(true);
  expect(
    canViewTenantNavItem(
      payrollNav,
      new Set(["payroll.settings.read"]),
      new Set(["ATTENDANCE"]),
    ),
  ).toBe(false);
  expect(
    canViewTenantNavItem(
      payrollNav,
      new Set(["attendance.reports.read"]),
      new Set(["PAYROLL"]),
    ),
  ).toBe(false);
});

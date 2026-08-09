import {
  Building2,
  ClipboardCheck,
  FileBarChart,
  Landmark,
  LayoutDashboard,
  ScrollText,
  Settings2,
  ShieldCheck,
  Upload,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { attendanceWorkspaceAccessPermissions } from "@/lib/attendance-navigation";
import {
  HRMS_ATTENDANCE_ROOT,
  HRMS_PAYROLL_ROOT,
  HRMS_ROOT,
  toCanonicalHrmsPath,
} from "@/lib/hrms-route-contract";

export type TenantNavItem = {
  label: string;
  localizationKey: string;
  href: string;
  icon?: typeof LayoutDashboard;
  permission?: string;
  anyPermissions?: string[];
  moduleKey?: string;
};

export type TenantNavigationContext =
  "employees" | "modules" | "reports" | "settings";

export const tenantPrimaryNavigation: TenantNavItem[] = [
  {
    label: "Dashboard",
    localizationKey: "tenant.navigation.dashboard",
    href: "/app",
    icon: LayoutDashboard,
  },
  {
    label: "Employees",
    localizationKey: "tenant.navigation.employees",
    href: "/app/employees",
    icon: UsersRound,
    anyPermissions: [
      "organization.employees.read",
      "organization.employees.reports.read",
      "organization.employees.self.read",
    ],
  },
  {
    label: "Attendance",
    localizationKey: "tenant.navigation.attendance",
    href: HRMS_ATTENDANCE_ROOT,
    icon: ClipboardCheck,
    moduleKey: "ATTENDANCE",
    anyPermissions: [...attendanceWorkspaceAccessPermissions],
  },
  {
    label: "Payroll",
    localizationKey: "tenant.navigation.payroll",
    href: HRMS_PAYROLL_ROOT,
    icon: WalletCards,
    moduleKey: "PAYROLL",
    anyPermissions: [
      "payroll.settings.read",
      "payroll.policies.read",
      "payroll.components.read",
      "payroll.structures.read",
      "payroll.compensation.read",
      "payroll.accounting.read",
      "payroll.runs.read",
      "payroll.payslips.read",
      "payroll.reports.generate",
      "attendance.payroll-lock.manage",
    ],
  },
  {
    label: "Reports",
    localizationKey: "tenant.navigation.reports",
    href: "/app/reports",
    icon: FileBarChart,
    anyPermissions: [
      "attendance.reports.read",
      "attendance.reports.generate",
      "organization.employees.reports.read",
    ],
  },
  {
    label: "Settings",
    localizationKey: "tenant.navigation.settings",
    href: "/app/settings",
    icon: Settings2,
    anyPermissions: [
      "workspace.settings.read",
      "identity.roles.read",
      "notifications.self",
      "billing.subscription.read",
      "attendance.config.read",
      "leave.manage",
      "workspace.audit.read",
    ],
  },
];

export const tenantContextNavigation: Record<
  TenantNavigationContext,
  TenantNavItem[]
> = {
  employees: [
    {
      label: "Directory",
      localizationKey: "tenant.navigation.directory",
      href: "/app/employees",
      anyPermissions: [
        "organization.employees.read",
        "organization.employees.reports.read",
        "organization.employees.self.read",
      ],
    },
    {
      label: "Organization",
      localizationKey: "tenant.navigation.organization",
      href: "/app/employees/organization",
      icon: Building2,
      permission: "organization.departments.read",
    },
    {
      label: "Bulk import",
      localizationKey: "tenant.navigation.bulkImport",
      href: "/app/employees/import",
      icon: Upload,
      permission: "organization.imports.read",
    },
  ],
  modules: [],
  reports: [
    {
      label: "Report center",
      localizationKey: "tenant.navigation.reportCenter",
      href: "/app/reports",
      anyPermissions: [
        "attendance.reports.read",
        "attendance.reports.generate",
        "organization.employees.reports.read",
      ],
    },
    {
      label: "Attendance reports",
      localizationKey: "tenant.navigation.attendanceReports",
      href: "/app/reports/attendance",
      moduleKey: "ATTENDANCE",
      anyPermissions: [
        "attendance.reports.read",
        "attendance.reports.generate",
      ],
    },
    {
      label: "Payroll reports",
      localizationKey: "tenant.navigation.payrollReports",
      href: "/app/reports/payroll",
      icon: WalletCards,
      moduleKey: "PAYROLL",
      anyPermissions: [
        "payroll.reports.generate",
        "payroll.runs.read",
        "attendance.reports.read",
      ],
    },
  ],
  settings: [
    {
      label: "Settings home",
      localizationKey: "tenant.navigation.settingsHome",
      href: "/app/settings",
      anyPermissions: [
        "workspace.settings.read",
        "identity.roles.read",
        "notifications.self",
        "billing.subscription.read",
        "workspace.audit.read",
      ],
    },
    {
      label: "Company",
      localizationKey: "tenant.navigation.company",
      href: "/app/settings/company",
      icon: Building2,
      permission: "workspace.settings.read",
    },
    {
      label: "Admin access",
      localizationKey: "tenant.navigation.adminAccess",
      href: "/app/settings/access",
      icon: ShieldCheck,
      permission: "identity.roles.read",
    },
    {
      label: "Security",
      localizationKey: "tenant.navigation.security",
      href: "/app/settings/security",
      icon: ShieldCheck,
      moduleKey: "ATTENDANCE",
      anyPermissions: [
        "attendance.devices.read",
        "attendance.security-alerts.read",
        "attendance.config.read",
      ],
    },
    {
      label: "Notifications",
      localizationKey: "tenant.navigation.notifications",
      href: "/app/settings/notifications",
      permission: "notifications.self",
    },
    {
      label: "Integrations",
      localizationKey: "tenant.navigation.integrations",
      href: "/app/settings/integrations",
      permission: "workspace.settings.read",
    },
    {
      label: "Audit history",
      localizationKey: "tenant.navigation.auditHistory",
      href: "/app/settings/audit",
      icon: ScrollText,
      permission: "workspace.audit.read",
    },
    {
      label: "Billing",
      localizationKey: "tenant.navigation.billing",
      href: "/app/settings/billing",
      icon: Landmark,
      permission: "billing.subscription.read",
    },
    {
      label: "Language & localization",
      localizationKey: "tenant.navigation.localization",
      href: "/app/settings/localization",
      permission: "workspace.localization.read",
    },
  ],
};

export function canViewTenantNavItem(
  item: TenantNavItem,
  permissions: Set<string>,
  moduleKeys: Set<string>,
) {
  if (item.permission && !permissions.has(item.permission)) return false;
  if (
    item.anyPermissions?.length &&
    !item.anyPermissions.some((permission) => permissions.has(permission))
  )
    return false;
  if (item.moduleKey && !moduleKeys.has(item.moduleKey)) return false;
  return true;
}

export function tenantNavigationContext(
  pathname: string,
): TenantNavigationContext | null {
  const canonicalPath = toCanonicalHrmsPath(pathname);
  if (
    canonicalPath.startsWith("/app/employees") ||
    canonicalPath.startsWith("/app/imports/employees") ||
    canonicalPath.startsWith("/app/organization")
  )
    return "employees";
  if (canonicalPath.startsWith("/app/reports")) return "reports";
  if (
    canonicalPath.startsWith("/app/modules") ||
    canonicalPath.startsWith("/app/hrms") ||
    canonicalPath.startsWith("/app/attendance") ||
    canonicalPath.startsWith("/app/leave")
  )
    return "modules";
  if (
    canonicalPath.startsWith("/app/settings") ||
    canonicalPath.startsWith("/app/access")
  )
    return "settings";
  return null;
}

export function tenantTopLevelActive(pathname: string, href: string) {
  const canonicalPath = toCanonicalHrmsPath(pathname);
  const canonicalHref = toCanonicalHrmsPath(href);
  if (canonicalHref === "/app") return canonicalPath === canonicalHref;
  const context = tenantNavigationContext(canonicalPath);
  if (canonicalHref === "/app/employees") return context === "employees";
  if (canonicalHref === HRMS_ATTENDANCE_ROOT)
    return (
      canonicalPath.startsWith(HRMS_ATTENDANCE_ROOT) ||
      canonicalPath.startsWith(`${HRMS_ROOT}/leave`)
    );
  if (canonicalHref === HRMS_PAYROLL_ROOT)
    return canonicalPath.startsWith(HRMS_PAYROLL_ROOT);
  if (canonicalHref === "/app/reports") return context === "reports";
  if (canonicalHref === "/app/settings") return context === "settings";
  return false;
}

export function tenantContextLinkActive(pathname: string, href: string) {
  if (["/app/modules", "/app/reports", "/app/settings"].includes(href))
    return pathname === href;
  if (href === "/app/employees")
    return (
      pathname.startsWith(href) &&
      !pathname.startsWith("/app/employees/organization") &&
      !pathname.startsWith("/app/employees/import")
    );
  return pathname === href || pathname.startsWith(`${href}/`);
}

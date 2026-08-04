import {
  Blocks,
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
    label: "Modules",
    localizationKey: "tenant.navigation.modules",
    href: "/app/modules",
    icon: Blocks,
    anyPermissions: [
      "workspace.modules.read",
      ...attendanceWorkspaceAccessPermissions,
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
  modules: [
    {
      label: "All modules",
      localizationKey: "tenant.navigation.allModules",
      href: "/app/modules",
      permission: "workspace.modules.read",
    },
    {
      label: "Attendance",
      localizationKey: "tenant.navigation.attendance",
      href: "/app/modules/attendance",
      icon: ClipboardCheck,
      moduleKey: "ATTENDANCE",
      anyPermissions: [...attendanceWorkspaceAccessPermissions],
    },
    {
      label: "Payroll",
      localizationKey: "tenant.navigation.payroll",
      href: "/app/modules/payroll",
      icon: WalletCards,
      moduleKey: "PAYROLL",
      anyPermissions: [
        "payroll.settings.read",
        "payroll.policies.read",
        "payroll.components.read",
        "payroll.structures.read",
        "payroll.compensation.read",
        "payroll.accounting.read",
        "attendance.payroll-lock.manage",
      ],
    },
  ],
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
  if (item.href === "/app/modules" && moduleKeys.size === 0) return false;
  return true;
}

export function tenantNavigationContext(
  pathname: string,
): TenantNavigationContext | null {
  if (
    pathname.startsWith("/app/employees") ||
    pathname.startsWith("/app/imports/employees") ||
    pathname.startsWith("/app/organization")
  )
    return "employees";
  if (pathname.startsWith("/app/reports")) return "reports";
  if (
    pathname.startsWith("/app/modules") ||
    pathname.startsWith("/app/attendance") ||
    pathname.startsWith("/app/leave")
  )
    return "modules";
  if (
    pathname.startsWith("/app/settings") ||
    pathname.startsWith("/app/access")
  )
    return "settings";
  return null;
}

export function tenantTopLevelActive(pathname: string, href: string) {
  if (href === "/app") return pathname === href;
  const context = tenantNavigationContext(pathname);
  if (href === "/app/employees") return context === "employees";
  if (href === "/app/modules") return context === "modules";
  if (href === "/app/reports") return context === "reports";
  if (href === "/app/settings") return context === "settings";
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

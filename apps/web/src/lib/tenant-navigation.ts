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

export type TenantNavItem = {
  label: string;
  href: string;
  icon?: typeof LayoutDashboard;
  permission?: string;
  anyPermissions?: string[];
  moduleKey?: string;
};

export type TenantNavigationContext =
  "employees" | "modules" | "reports" | "settings";

export const tenantPrimaryNavigation: TenantNavItem[] = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  {
    label: "Employees",
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
    href: "/app/modules",
    icon: Blocks,
    permission: "workspace.modules.read",
  },
  {
    label: "Reports",
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
      href: "/app/employees",
      anyPermissions: [
        "organization.employees.read",
        "organization.employees.reports.read",
        "organization.employees.self.read",
      ],
    },
    {
      label: "Organization",
      href: "/app/employees/organization",
      icon: Building2,
      permission: "organization.departments.read",
    },
    {
      label: "Bulk import",
      href: "/app/employees/import",
      icon: Upload,
      permission: "organization.imports.read",
    },
  ],
  modules: [
    {
      label: "All modules",
      href: "/app/modules",
      permission: "workspace.modules.read",
    },
    {
      label: "Attendance",
      href: "/app/modules/attendance",
      icon: ClipboardCheck,
      moduleKey: "ATTENDANCE",
      anyPermissions: [
        "attendance.records.read",
        "attendance.config.read",
        "attendance.approvals.manage",
      ],
    },
    {
      label: "Payroll",
      href: "/app/modules/payroll",
      icon: WalletCards,
      moduleKey: "PAYROLL",
      anyPermissions: [
        "attendance.reports.read",
        "attendance.reports.generate",
        "attendance.payroll-lock.manage",
      ],
    },
  ],
  reports: [
    {
      label: "Report center",
      href: "/app/reports",
      anyPermissions: [
        "attendance.reports.read",
        "attendance.reports.generate",
        "organization.employees.reports.read",
      ],
    },
    {
      label: "Attendance reports",
      href: "/app/reports/attendance",
      moduleKey: "ATTENDANCE",
      anyPermissions: [
        "attendance.reports.read",
        "attendance.reports.generate",
      ],
    },
    {
      label: "Payroll reports",
      href: "/app/reports/payroll",
      icon: WalletCards,
      moduleKey: "PAYROLL",
      anyPermissions: [
        "attendance.reports.read",
        "attendance.reports.generate",
      ],
    },
  ],
  settings: [
    {
      label: "Settings home",
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
      href: "/app/settings/company",
      icon: Building2,
      permission: "workspace.settings.read",
    },
    {
      label: "Admin access",
      href: "/app/settings/access",
      icon: ShieldCheck,
      permission: "identity.roles.read",
    },
    {
      label: "Security",
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
      href: "/app/settings/notifications",
      permission: "notifications.self",
    },
    {
      label: "Integrations",
      href: "/app/settings/integrations",
      permission: "workspace.settings.read",
    },
    {
      label: "Audit history",
      href: "/app/settings/audit",
      icon: ScrollText,
      permission: "workspace.audit.read",
    },
    {
      label: "Billing",
      href: "/app/settings/billing",
      icon: Landmark,
      permission: "billing.subscription.read",
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

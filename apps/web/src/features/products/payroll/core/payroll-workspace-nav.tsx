"use client";

import {
  Calculator,
  FileSpreadsheet,
  Home,
  LayoutDashboard,
  LockKeyhole,
  PlayCircle,
  ReceiptText,
  Settings2,
  WalletCards,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { payrollSectionForPath } from "@/lib/payroll-navigation";
import { useTenantLocalization } from "@/lib/tenant-localization";

const payrollNavItems = [
  {
    section: "home" as const,
    label: "Home",
    href: "/app",
    icon: Home,
  },
  {
    section: "overview" as const,
    label: "Overview",
    href: "/app/modules/payroll",
    icon: LayoutDashboard,
  },
  {
    section: "foundation" as const,
    label: "Setup",
    href: "/app/modules/payroll/setup",
    icon: WalletCards,
  },
  {
    section: "runs" as const,
    label: "Run preparation",
    href: "/app/modules/payroll/runs",
    icon: PlayCircle,
  },
  {
    section: "processing" as const,
    label: "Processing",
    href: "/app/modules/payroll/processing",
    icon: Calculator,
  },
  {
    section: "payslips" as const,
    label: "Payslips",
    href: "/app/modules/payroll/payslips",
    icon: ReceiptText,
  },
  {
    section: "exports" as const,
    label: "Exports",
    href: "/app/modules/payroll/exports",
    icon: FileSpreadsheet,
  },
  {
    section: "close" as const,
    label: "Period close",
    href: "/app/attendance/payroll",
    icon: LockKeyhole,
  },
  {
    section: "settings" as const,
    label: "Settings",
    href: "/app/settings/payroll",
    icon: Settings2,
  },
];

export function PayrollWorkspaceNav() {
  const pathname = usePathname();
  const currentSection = payrollSectionForPath(pathname);
  const { tText } = useTenantLocalization();

  return (
    <nav
      aria-label={tText("Payroll workspace")}
      className="sticky top-16 z-20 flex min-h-14 items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-3 shadow-sm lg:px-6"
    >
      {payrollNavItems.map((item) => {
        const active = currentSection === item.section;
        const Icon = item.icon;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition",
              active
                ? "bg-zinc-700 text-white"
                : "text-on-surface-variant hover:bg-zinc-100 hover:text-zinc-700",
            )}
            href={item.href}
            key={item.href}
          >
            <Icon className="size-4" />
            {tText(item.label)}
          </Link>
        );
      })}
    </nav>
  );
}

export function PayrollSidebarNav({
  collapsed,
}: {
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const currentSection = payrollSectionForPath(pathname);
  const { tText } = useTenantLocalization();

  return (
    <div className="flex flex-col gap-1 px-3 pt-5">
      <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
        {collapsed ? "" : tText("Payroll")}
      </div>
      {payrollNavItems.map((item) => {
        const active = currentSection === item.section;
        const Icon = item.icon;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
              collapsed && "justify-center",
              active
                ? "bg-zinc-600 text-white"
                : "text-zinc-300 hover:bg-zinc-600/50 hover:text-white",
            )}
            href={item.href}
            key={item.href}
            title={collapsed ? item.label : undefined}
          >
            <Icon className="size-5 shrink-0" />
            {collapsed ? null : tText(item.label)}
          </Link>
        );
      })}
    </div>
  );
}

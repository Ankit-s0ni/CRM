"use client";

import {
  WalletCards,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { payrollSectionForPath } from "@/lib/payroll-navigation";
import { useTenantLocalization } from "@/lib/tenant-localization";

const payrollNavItems = [
  {
    section: "foundation" as const,
    label: "Payroll organization setup",
    href: "/app/modules/payroll",
    icon: WalletCards,
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

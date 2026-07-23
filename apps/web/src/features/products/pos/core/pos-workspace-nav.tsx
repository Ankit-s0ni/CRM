"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { posWorkspaceItems, posTabActive } from "@/lib/pos-navigation";
import { cn } from "@/lib/utils";

export function PosWorkspaceChrome() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="POS workspace"
      className="sticky top-16 z-20 flex min-h-14 items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-3 shadow-sm lg:px-6"
    >
      {posWorkspaceItems.map((item) => {
        const active = posTabActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <div
            className={cn("flex shrink-0 items-center rounded-lg", active && "bg-zinc-50")}
            key={item.href}
          >
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap px-3 py-3 text-sm font-semibold transition flex items-center gap-2",
                active ? "text-primary" : "text-on-surface-variant hover:text-zinc-700"
              )}
              href={item.href}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

export function PosRouteGate({ children }: { children: React.ReactNode }) {
  // We can add specific module permission checks here if needed in the future
  return <>{children}</>;
}

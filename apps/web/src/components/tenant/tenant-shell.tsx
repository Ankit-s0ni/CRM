"use client";

import {
  Bell,
  Blocks,
  Building2,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings2,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const businessNavigation = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  {
    label: "Employees",
    href: "/app/employees",
    icon: UsersRound,
    permission: "organization.employees.read",
  },
  {
    label: "Modules",
    href: "/app/modules",
    icon: Blocks,
    permission: "workspace.modules.read",
  },
  {
    label: "Settings",
    href: "/app/settings",
    icon: Settings2,
    permission: "workspace.settings.read",
  },
];

const contextNavigation = {
  employees: [
    { label: "Directory", href: "/app/employees", permission: "organization.employees.read" },
    { label: "Organization", href: "/app/organization", permission: "organization.departments.read" },
    { label: "Bulk import", href: "/app/imports/employees", permission: "organization.imports.read" },
  ],
  modules: [
    { label: "All modules", href: "/app/modules", permission: "workspace.modules.read" },
    { label: "Attendance", href: "/app/modules/attendance", permission: "workspace.modules.read" },
    { label: "Leave", href: "/app/modules/leave", permission: "leave.self" },
  ],
  settings: [
    { label: "Settings home", href: "/app/settings", permission: "workspace.settings.read" },
    { label: "Company", href: "/app/settings/company", permission: "workspace.settings.read" },
    { label: "Users & roles", href: "/app/access", permission: "identity.roles.read" },
    { label: "Billing", href: "/app/settings/billing", permission: "billing.subscription.read" },
  ],
};

export function TenantShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, clearAuth, hasHydrated, setUser } = useAuthStore();
  const userId = user?.id;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [attendanceEnabled, setAttendanceEnabled] = useState(false);

  useEffect(() => {
    if (hasHydrated && !accessToken)
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [accessToken, hasHydrated, pathname, router]);

  useEffect(() => {
    if (!accessToken) return;
    apiClient
      .get<{ modules: Array<{ key: string }> }>("/workspace/modules")
      .then(({ data }) =>
        setAttendanceEnabled(
          data.modules.some(({ key }) => key === "ATTENDANCE"),
        ),
      )
      .catch((error) => {
        if (error.response?.data?.code === "TENANT_SUSPENDED")
          router.replace("/workspace-unavailable?code=TENANT_SUSPENDED");
      });
  }, [accessToken, router]);

  useEffect(() => {
    if (!accessToken || !userId) return;
    apiClient
      .get<{
        user: {
          id: string;
          email: string;
          roles: string[];
          permissions: string[];
        };
        workspace: { id: string; companyName: string; subdomain: string; logoUrl?: string | null };
      }>("/auth/me")
      .then(({ data }) => {
        setUser({
          id: data.user.id,
          email: data.user.email,
          tenantId: data.workspace.id,
          workspace: data.workspace.subdomain,
          companyName: data.workspace.companyName,
          roles: data.user.roles,
          permissions: data.user.permissions,
          logoUrl: data.workspace.logoUrl,
        });
      })
      .catch(() => undefined);
  }, [accessToken, setUser, userId]);

  if (pathname === "/app/onboarding") return <>{children}</>;
  if (!hasHydrated || !accessToken || !user)
    return <div className="min-h-screen bg-[#fcf8ff]" />;

  const permissions = new Set(user.permissions ?? []);
  const navigation = businessNavigation.filter(
    (item) =>
      (!item.permission || permissions.has(item.permission)) &&
      (item.href !== "/app/modules" || attendanceEnabled),
  );
  const currentContext = navigationContext(pathname);
  const contextItems = currentContext
    ? contextNavigation[currentContext].filter(
        (item) => !item.permission || permissions.has(item.permission),
      )
    : [];
  return (
    <div className="min-h-screen bg-[#fcf8ff] text-[#1b1b24]">
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[#302f39] text-[#e4e1ee] shadow-xl transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-20 items-center gap-3 px-6">
          <div className="grid size-10 place-items-center overflow-hidden rounded-xl bg-[#4f46e5] text-white">
            {user.logoUrl ? <Image alt={`${user.companyName ?? "Workspace"} logo`} className="size-full bg-white object-contain p-1" height={40} src={user.logoUrl} unoptimized width={40} /> : <Building2 className="size-5" />}
          </div>
          <div>
            <div className="text-lg font-bold text-[#e2dfff]">{user.companyName || "DeltCRM"}</div>
            <div className="max-w-40 truncate text-[10px] font-semibold uppercase tracking-[.16em] text-[#c7c4d8]">
              DeltCRM workspace
            </div>
          </div>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {navigation.map((item) => {
            const active = topLevelActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex min-h-10 items-center gap-4 rounded-lg border-l-4 px-4 py-2 text-sm transition",
                  active
                    ? "border-[#c3c0ff] bg-[#4f46e5]/25 text-[#c3c0ff]"
                    : "border-transparent text-[#c7c4d8] hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="size-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <button
            className="flex h-10 w-full items-center gap-4 px-4 text-sm text-[#c7c4d8]"
            onClick={() => {
              clearAuth();
              router.replace("/login");
            }}
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      </aside>
      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[#e4e1ee] bg-[#fcf8ff]/95 px-4 shadow-sm backdrop-blur lg:px-6">
          <button
            className="mr-3 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </button>
          <div className="relative hidden w-full max-w-md sm:block">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#777587]" />
            <input
              className="h-10 w-full rounded-full border-0 bg-[#f0ecf9] pl-11 pr-4 text-sm outline-none ring-[#3525cd] focus:ring-2"
              placeholder="Search employees or settings..."
            />
          </div>
          <div className="ml-auto flex items-center gap-5 text-[#464555]">
            <Link aria-label="Notifications" href="/app/notifications"><Bell className="size-[18px]" /></Link>
            <CircleHelp className="size-[18px]" />
            <div className="h-6 w-px bg-[#e4e1ee]" />
            <div className="grid size-9 place-items-center rounded-full bg-[#4f46e5] text-xs font-bold text-white">
              {user.email.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-right sm:block">
              <div className="max-w-44 truncate text-xs font-semibold">
                {user.email}
              </div>
              <div className="text-[10px] text-[#777587]">
                {user.roles?.[0]?.replaceAll("_", " ") ?? "Workspace user"}
              </div>
            </div>
            <ChevronDown className="size-4" />
          </div>
        </header>
        {contextItems.length > 0 && (
          <nav
            aria-label={`${currentContext} navigation`}
            className="sticky top-16 z-20 flex min-h-12 items-center gap-1 overflow-x-auto border-b border-[#e4e1ee] bg-white px-4 lg:px-6"
          >
            {contextItems.map((item) => {
              const active = contextLinkActive(pathname, item.href);
              return (
                <Link
                  className={cn(
                    "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition",
                    active
                      ? "border-[#3525cd] text-[#3525cd]"
                      : "border-transparent text-[#777587] hover:text-[#302f39]",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
        <main>{children}</main>
      </div>
    </div>
  );
}

function navigationContext(pathname: string): keyof typeof contextNavigation | null {
  if (
    pathname.startsWith("/app/employees") ||
    pathname.startsWith("/app/imports/employees") ||
    pathname.startsWith("/app/organization")
  ) return "employees";
  if (
    pathname.startsWith("/app/modules") ||
    pathname.startsWith("/app/attendance") ||
    pathname.startsWith("/app/leave") ||
    pathname.startsWith("/app/settings/attendance")
  ) return "modules";
  if (pathname.startsWith("/app/settings") || pathname.startsWith("/app/access")) {
    return "settings";
  }
  return null;
}

function topLevelActive(pathname: string, href: string) {
  if (href === "/app") return pathname === href;
  if (href === "/app/employees") return navigationContext(pathname) === "employees";
  if (href === "/app/modules") return navigationContext(pathname) === "modules";
  if (href === "/app/settings") return navigationContext(pathname) === "settings";
  return false;
}

function contextLinkActive(pathname: string, href: string) {
  if (href === "/app/modules") return pathname === href;
  if (href === "/app/settings") return pathname === href;
  if (href === "/app/employees") return pathname.startsWith(href);
  return pathname === href || pathname.startsWith(`${href}/`);
}

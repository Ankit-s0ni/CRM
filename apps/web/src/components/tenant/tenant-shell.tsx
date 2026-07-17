"use client";

import {
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileUp,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  MonitorSmartphone,
  Network,
  Search,
  Settings2,
  Siren,
  ShieldCheck,
  TableProperties,
  SlidersHorizontal,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const businessNavigation = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  {
    label: "Organization",
    href: "/app/organization",
    icon: Network,
    permission: "organization.departments.read",
  },
  {
    label: "Employees",
    href: "/app/employees",
    icon: UsersRound,
    permission: "organization.employees.read",
  },
  {
    label: "Bulk Import",
    href: "/app/imports/employees",
    icon: FileUp,
    permission: "organization.imports.read",
  },
  {
    label: "Users & Roles",
    href: "/app/access",
    icon: ShieldCheck,
    permission: "identity.roles.read",
  },
  {
    label: "Company Settings",
    href: "/app/settings/company",
    icon: Settings2,
    permission: "workspace.settings.read",
  },
];

const attendanceNavigation = [
  {
    label: "Employee Devices",
    href: "/app/attendance/devices",
    icon: MonitorSmartphone,
    permission: "attendance.devices.read",
  },
  {
    label: "Security Feed",
    href: "/app/attendance/security",
    icon: Siren,
    permission: "attendance.security-alerts.read",
  },
  {
    label: "Attendance Register",
    href: "/app/attendance/register",
    icon: TableProperties,
    permission: "attendance.records.read",
  },
  {
    label: "OD & WFH",
    href: "/app/attendance/exceptions",
    icon: CalendarDays,
    permission: "attendance.exceptions.read",
  },
  {
    label: "Attendance Defaults",
    href: "/app/settings/attendance",
    icon: SlidersHorizontal,
    permission: "attendance.config.manage",
  },
  {
    label: "Offices",
    href: "/app/attendance/offices",
    icon: MapPinned,
    permission: "attendance.offices.read",
  },
  {
    label: "Policies",
    href: "/app/attendance/policies",
    icon: ShieldCheck,
    permission: "attendance.policies.read",
  },
  {
    label: "Shifts",
    href: "/app/attendance/shifts",
    icon: Clock3,
    permission: "attendance.shifts.read",
  },
  {
    label: "Roster",
    href: "/app/attendance/rosters",
    icon: CalendarDays,
    permission: "attendance.rosters.read",
  },
  {
    label: "Holidays",
    href: "/app/attendance/holidays",
    icon: CalendarDays,
    permission: "attendance.holidays.read",
  },
];

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
        workspace: { id: string; companyName: string; subdomain: string };
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
        });
      })
      .catch(() => undefined);
  }, [accessToken, setUser, userId]);

  if (pathname === "/app/onboarding") return <>{children}</>;
  if (!hasHydrated || !accessToken || !user)
    return <div className="min-h-screen bg-[#fcf8ff]" />;

  const permissions = new Set(user.permissions ?? []);
  const navigation = (
    attendanceEnabled
      ? [...businessNavigation, ...attendanceNavigation]
      : businessNavigation
  ).filter((item) => !item.permission || permissions.has(item.permission));
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
          <div className="grid size-10 place-items-center rounded-xl bg-[#4f46e5] text-white">
            <Building2 className="size-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-[#e2dfff]">IndigoHR</div>
            <div className="max-w-40 truncate text-[10px] font-semibold uppercase tracking-[.16em] text-[#c7c4d8]">
              {user.companyName || user.workspace || "Workspace"}
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
            const active =
              pathname === item.href ||
              (item.href !== "/app" && pathname.startsWith(`${item.href}/`));
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
          {permissions.has("organization.employees.create") && (
            <Link
              href="/app/employees/new"
              className="mb-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#e2dfff] text-sm font-semibold text-[#0f0069]"
            >
              <UserRoundPlus className="size-4" />
              Add New Employee
            </Link>
          )}
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
            <Bell className="size-[18px]" />
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
        <main>{children}</main>
      </div>
    </div>
  );
}

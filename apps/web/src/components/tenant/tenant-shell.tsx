"use client";

import {
  Bell,
  Building2,
  ChevronDown,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import {
  type AttendanceCapabilities,
  canAccessAttendanceWorkspace,
  isAttendanceWorkspacePath,
} from "@/lib/attendance-navigation";
import { cn } from "@/lib/utils";
import { HeaderContextHelp } from "@/components/help/feature-info";
import {
  canViewTenantNavItem,
  tenantContextLinkActive,
  tenantContextNavigation,
  tenantNavigationContext,
  tenantPrimaryNavigation,
  tenantTopLevelActive,
} from "@/lib/tenant-navigation";
import {
  AttendanceRouteGate,
  AttendanceWorkspaceChrome,
} from "./attendance-workspace-nav";
import { PortalSearch } from "./portal-search";

export function TenantShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, clearAuth, hasHydrated, setUser } = useAuthStore();
  const userId = user?.id;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [enabledModuleKeys, setEnabledModuleKeys] = useState<Set<string>>(
    new Set(),
  );
  const [modulesLoaded, setModulesLoaded] = useState(false);
  const [attendanceCapabilityState, setAttendanceCapabilityState] = useState<{
    pathname: string;
    value: AttendanceCapabilities | null;
  } | null>(null);

  useEffect(() => {
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
    document.documentElement.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow-y");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("overflow-y");
  }, [pathname]);

  useEffect(() => {
    if (hasHydrated && !accessToken)
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [accessToken, hasHydrated, pathname, router]);

  useEffect(() => {
    if (!accessToken) return;
    apiClient
      .get<{ modules: Array<{ key: string }> }>("/workspace/modules")
      .then(({ data }) =>
        setEnabledModuleKeys(new Set(data.modules.map(({ key }) => key))),
      )
      .catch((error) => {
        if (error.response?.data?.code === "TENANT_SUSPENDED")
          router.replace("/workspace-unavailable?code=TENANT_SUSPENDED");
      })
      .finally(() => setModulesLoaded(true));
  }, [accessToken, router]);

  useEffect(() => {
    if (
      !accessToken ||
      !enabledModuleKeys.has("ATTENDANCE") ||
      !isAttendanceWorkspacePath(pathname)
    ) {
      return;
    }
    let active = true;
    apiClient
      .get<{ data: AttendanceCapabilities }>(
        "/workspace/attendance-capabilities",
      )
      .then(({ data }) => {
        if (active) {
          setAttendanceCapabilityState({ pathname, value: data.data });
        }
      })
      .catch(() => {
        if (active) {
          setAttendanceCapabilityState({ pathname, value: null });
        }
      });
    return () => {
      active = false;
    };
  }, [accessToken, enabledModuleKeys, pathname]);

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
        workspace: {
          id: string;
          companyName: string;
          subdomain: string;
          logoUrl?: string | null;
        };
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
    return <div className="min-h-screen bg-surface" />;

  const permissions = new Set(user.permissions ?? []);
  const navigation = tenantPrimaryNavigation.filter((item) =>
    canViewTenantNavItem(item, permissions, enabledModuleKeys),
  );
  const currentContext = tenantNavigationContext(pathname);
  const contextItems = currentContext
    ? tenantContextNavigation[currentContext].filter((item) => {
        if (!canViewTenantNavItem(item, permissions, enabledModuleKeys))
          return false;
        if (item.href === "/app/modules/attendance")
          return canAccessAttendanceWorkspace(permissions);
        return true;
      })
    : [];
  const attendanceWorkspace = isAttendanceWorkspacePath(pathname);
  const attendanceCapabilities =
    attendanceCapabilityState?.pathname === pathname
      ? attendanceCapabilityState.value
      : null;
  const attendanceCapabilitiesLoaded =
    attendanceCapabilityState?.pathname === pathname;
  return (
    <div className="min-h-screen bg-surface text-zinc-900">
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-zinc-700 text-surface-variant shadow-xl transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-20 items-center gap-3 px-6">
          <div className="grid size-10 place-items-center overflow-hidden rounded-xl bg-primary-container text-white">
            {user.logoUrl ? (
              <Image
                alt={`${user.companyName ?? "Workspace"} logo`}
                className="size-full bg-white object-contain p-1"
                height={40}
                src={user.logoUrl}
                unoptimized
                width={40}
              />
            ) : (
              <Building2 className="size-5" />
            )}
          </div>
          <div>
            <div className="text-lg font-bold text-zinc-100">
              {user.companyName || "DeltCRM"}
            </div>
            <div className="max-w-40 truncate text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-300">
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
            const active = tenantTopLevelActive(pathname, item.href);
            const Icon = item.icon!;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex min-h-10 items-center gap-4 rounded-lg border-l-4 px-4 py-2 text-sm transition",
                  active
                    ? "border-zinc-200 bg-primary-container/25 text-zinc-200"
                    : "border-transparent text-zinc-300 hover:bg-white/5 hover:text-white",
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
            className="flex h-10 w-full items-center gap-4 px-4 text-sm text-zinc-300"
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
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-surface-variant bg-surface/95 px-4 shadow-sm backdrop-blur lg:px-6">
          <button
            className="mr-3 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </button>
          <div className="hidden w-full sm:block">
            <PortalSearch />
          </div>
          <div className="ml-auto flex items-center gap-5 text-on-surface-variant">
            <Link aria-label="Notifications" href="/app/notifications">
              <Bell className="size-[18px]" />
            </Link>
            <HeaderContextHelp />
            <div className="h-6 w-px bg-surface-variant" />
            <div className="grid size-9 place-items-center rounded-full bg-primary-container text-xs font-bold text-white">
              {user.email.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-right sm:block">
              <div className="max-w-44 truncate text-xs font-semibold">
                {user.email}
              </div>
              <div className="text-[10px] text-outline">
                {user.roles?.[0]?.replaceAll("_", " ") ?? "Workspace user"}
              </div>
            </div>
            <ChevronDown className="size-4" />
          </div>
        </header>
        {attendanceWorkspace ? (
          <AttendanceWorkspaceChrome
            capabilities={attendanceCapabilities}
            permissions={user.permissions ?? []}
          />
        ) : (
          contextItems.length > 0 && (
            <nav
              aria-label={`${currentContext} navigation`}
              className="sticky top-16 z-20 flex min-h-12 items-center gap-1 overflow-x-auto border-b border-surface-variant bg-white px-4 lg:px-6"
            >
              {contextItems.map((item) => {
                const active = tenantContextLinkActive(pathname, item.href);
                return (
                  <Link
                    className={cn(
                      "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition",
                      active
                        ? "border-primary text-primary"
                        : "border-transparent text-outline hover:text-zinc-700",
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )
        )}
        <main>
          {attendanceWorkspace ? (
            <AttendanceRouteGate
              attendanceEnabled={enabledModuleKeys.has("ATTENDANCE")}
              capabilities={attendanceCapabilities}
              capabilitiesLoaded={attendanceCapabilitiesLoaded}
              modulesLoaded={modulesLoaded}
              permissions={user.permissions ?? []}
            >
              {children}
            </AttendanceRouteGate>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

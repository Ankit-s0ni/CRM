"use client";

import {
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Link,
  usePathname,
  useRouter,
} from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import {
  type AttendanceCapabilities,
  canAccessAttendanceWorkspace,
  isAttendanceWorkspacePath,
} from "@/lib/attendance-navigation";
import { cn } from "@/lib/utils";
import { HeaderContextHelp } from "@/features/platform/help/feature-info";
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
} from "@/features/products/attendance/core/attendance-workspace-nav";
import { PortalSearch } from "@/shared/components/portal-search";
import { LanguageToggle } from "@/shared/components/language-toggle";
import { useTenantLocalization } from "@/lib/tenant-localization";
import { localizedTenantPath } from "@/lib/tenant-routes";
import { focusRingClass } from "@/shared/components/page-primitives";

const SIDEBAR_STORAGE_KEY = "deltcrm-sidebar-collapsed";
const SIDEBAR_CHANGE_EVENT = "deltcrm:sidebar-change";

function subscribeToSidebarPreference(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SIDEBAR_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SIDEBAR_CHANGE_EVENT, onStoreChange);
  };
}

function sidebarPreferenceSnapshot() {
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function sidebarPreferenceServerSnapshot() {
  return false;
}

const contextLabels: Record<
  NonNullable<ReturnType<typeof tenantNavigationContext>>,
  string
> = {
  employees: "Employees",
  modules: "Modules",
  reports: "Reports",
  settings: "Settings",
};

export function TenantShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, clearAuth, hasHydrated, setUser } = useAuthStore();
  const {
    t,
    tText,
    direction,
    locale,
  } = useTenantLocalization();
  const searchParams = useSearchParams();
  const userId = user?.id;
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktopCollapsed = useSyncExternalStore(
    subscribeToSidebarPreference,
    sidebarPreferenceSnapshot,
    sidebarPreferenceServerSnapshot,
  );
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

  function toggleDesktopSidebar() {
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      String(!desktopCollapsed),
    );
    window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT));
  }

  useEffect(() => {
    if (!hasHydrated || accessToken) return;
    const query = searchParams.toString();
    const tenantPath = localizedTenantPath(
      `${pathname}${query ? `?${query}` : ""}`,
      locale,
    );
    window.location.replace(`/login?next=${encodeURIComponent(tenantPath)}`);
  }, [accessToken, hasHydrated, locale, pathname, searchParams]);

  useEffect(() => {
    if (!accessToken) return;
    apiClient
      .get<{ modules: Array<{ key: string }> }>("/workspace/modules")
      .then(({ data }) =>
        setEnabledModuleKeys(new Set(data.modules.map(({ key }) => key))),
      )
      .catch((error) => {
        if (error.response?.data?.code === "TENANT_SUSPENDED")
          window.location.replace(
            "/workspace-unavailable?code=TENANT_SUSPENDED",
          );
      })
      .finally(() => setModulesLoaded(true));
  }, [accessToken]);

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
        localization: NonNullable<
          ReturnType<typeof useAuthStore.getState>["user"]
        >["localization"];
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
          localization: data.localization,
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
  const activeContextItem = contextItems.find((item) =>
    tenantContextLinkActive(pathname, item.href),
  );
  return (
    <div className="min-h-screen bg-[#fbfaf6] text-[#151515]">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1200] focus:rounded-lg focus:bg-[#151515] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        href="#tenant-main-content"
      >
        {t("tenant.shell.skipToContent", "Skip to main content")}
      </a>
      {mobileOpen && (
        <button
          aria-label={t(
            "tenant.shell.closeNavigation",
            "Close navigation",
          )}
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-[280px] flex-col border-e border-[#beb8ad] bg-[#fbfaf6] text-[#151515] shadow-[8px_0_30px_rgba(20,20,20,0.06)] transition-[width,transform] duration-200 lg:translate-x-0",
          desktopCollapsed ? "lg:w-[84px]" : "lg:w-[280px]",
          mobileOpen
            ? "translate-x-0"
            : direction === "rtl"
              ? "translate-x-full"
              : "-translate-x-full",
        )}
      >
        <button
          aria-expanded={!desktopCollapsed}
          aria-label={
            desktopCollapsed
              ? t("tenant.shell.expandNavigation", "Expand navigation")
              : t("tenant.shell.collapseNavigation", "Collapse navigation")
          }
          className={cn(
            "absolute -end-3 top-6 z-10 hidden size-7 place-items-center rounded-full border border-[#beb8ad] bg-[#fbfaf6] text-[#151515] shadow-sm transition hover:bg-white lg:grid",
            focusRingClass,
          )}
          onClick={toggleDesktopSidebar}
          title={
            desktopCollapsed
              ? t("tenant.shell.expandNavigation", "Expand navigation")
              : t("tenant.shell.collapseNavigation", "Collapse navigation")
          }
          type="button"
        >
          {desktopCollapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
        <div
          className={cn(
            "flex h-20 items-center gap-3 px-6",
            desktopCollapsed && "lg:justify-center lg:px-3",
          )}
        >
          <div className="grid size-11 place-items-center overflow-hidden rounded-[6px] border border-[#151515] bg-[#fbfaf6] text-[#151515]">
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
          <div className={cn(desktopCollapsed && "lg:hidden")}>
            <div className="text-xl font-medium text-[#151515]">
              {user.companyName || tText("DeltCRM")}
            </div>
            <div className="max-w-40 truncate text-[13px] text-[#444]">
              {t("tenant.shell.workspace", "DeltCRM HRMS")}
            </div>
          </div>
          <button
            aria-label={t(
              "tenant.shell.closeNavigation",
              "Close navigation",
            )}
            className={cn("ms-auto rounded-lg p-2 text-[#151515] lg:hidden", focusRingClass)}
            onClick={() => setMobileOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          <div
            className={cn(
              "px-4 pb-4 pt-8 text-[12px] font-medium uppercase tracking-[.08em] text-[#555]",
              desktopCollapsed && "lg:hidden",
            )}
          >
            {t("tenant.shell.mainNavigation", "Main navigation")}
          </div>
          {navigation.map((item) => {
            const active = tenantTopLevelActive(pathname, item.href);
            const Icon = item.icon!;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex min-h-14 items-center gap-4 rounded-[5px] border px-4 py-2 text-[18px] font-medium transition",
                  desktopCollapsed && "lg:justify-center lg:gap-0 lg:px-2",
                  active
                    ? "border-[#beb8ad] bg-[#fffefa] text-black shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                    : "border-transparent text-[#151515] hover:border-[#d7d0c4] hover:bg-[#fffefa]",
                )}
                title={
                  desktopCollapsed
                    ? t(item.localizationKey, item.label)
                    : undefined
                }
              >
                <Icon className="size-[22px] shrink-0 stroke-[1.7]" />
                <span className={cn(desktopCollapsed && "lg:hidden")}>
                  {t(item.localizationKey, item.label)}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[#ded8ce] p-4">
          <button
            aria-label={t("tenant.shell.logout", "Logout")}
            className={cn(
              "flex min-h-11 w-full items-center gap-4 rounded-[5px] px-4 text-[18px] text-[#151515] transition hover:bg-[#fffefa]",
              desktopCollapsed && "lg:justify-center lg:gap-0 lg:px-0",
              focusRingClass,
            )}
            onClick={() => {
              clearAuth();
              window.location.replace("/login");
            }}
          >
            <LogOut className="size-4" />
            <span className={cn(desktopCollapsed && "lg:hidden")}>
              {t("tenant.shell.logout", "Logout")}
            </span>
          </button>
        </div>
      </aside>
      <div
        className={cn(
          "transition-[padding] duration-200",
          desktopCollapsed ? "lg:ps-[84px]" : "lg:ps-[280px]",
        )}
      >
        <header className="sticky top-0 z-30 flex min-h-[76px] items-center border-b border-[#beb8ad] bg-[#fbfaf6]/95 px-4 backdrop-blur lg:px-8">
          <button
            aria-label={t(
              "tenant.shell.openNavigation",
              "Open navigation",
            )}
            className={cn("me-3 rounded-lg p-2 text-[#151515] lg:hidden", focusRingClass)}
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </button>
          <div className="min-w-0 flex-1">
            <div className="hidden items-center gap-2 text-xs text-[#4a4a4a] lg:flex">
              <Link className="font-semibold text-[#151515]" href="/app">
                {t("tenant.navigation.dashboard", "Dashboard")}
              </Link>
              {currentContext && (
                <>
                  <ChevronRight className="directional-icon size-3" />
                  <span>
                    {t(
                      `tenant.navigation.${currentContext}`,
                      contextLabels[currentContext],
                    )}
                  </span>
                </>
              )}
              {activeContextItem && (
                <>
                  <ChevronRight className="directional-icon size-3" />
                  <span className="truncate">
                    {t(
                      activeContextItem.localizationKey,
                      activeContextItem.label,
                    )}
                  </span>
                </>
              )}
            </div>
            <div className="mt-1 hidden w-full sm:block">
              <PortalSearch />
            </div>
          </div>
          <div className="ms-auto flex items-center gap-3 text-[#151515] sm:gap-4">
            <LanguageToggle />
            <Link
              aria-label={t(
                "tenant.shell.notifications",
                "Notifications",
              )}
              href="/app/notifications"
              className={cn(
                "grid size-10 place-items-center rounded-[5px] hover:bg-[#fffefa]",
                focusRingClass,
              )}
            >
              <Bell className="size-[18px]" />
            </Link>
            <HeaderContextHelp />
            <div className="hidden h-8 w-px bg-[#beb8ad] sm:block" />
            <div className="grid size-11 place-items-center rounded-full border border-[#151515] bg-[#fbfaf6] text-sm font-medium text-[#151515]">
              {user.email.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-end sm:block">
              <div className="max-w-44 truncate text-[15px] font-semibold text-[#151515]">
                {user.email}
              </div>
              <div className="text-[12px] text-[#444]">
                {user.roles?.[0]?.replaceAll("_", " ") ??
                  t("tenant.shell.workspaceUser", "Workspace user")}
              </div>
            </div>
            <ChevronDown className="size-4" />
          </div>
        </header>
        <div className="border-b border-[#beb8ad] bg-[#fbfaf6] px-4 py-3 sm:hidden">
          <PortalSearch />
        </div>
        {attendanceWorkspace ? (
          <AttendanceWorkspaceChrome
            capabilities={attendanceCapabilities}
            permissions={user.permissions ?? []}
          />
        ) : (
          contextItems.length > 0 && (
            <nav
              aria-label={t(
                "tenant.shell.contextNavigation",
                "{context} navigation",
                { context: currentContext ?? "" },
              )}
              className="sticky top-[76px] z-20 flex min-h-12 items-center gap-1 overflow-x-auto border-b border-[#beb8ad] bg-[#fbfaf6] px-4 lg:px-8"
            >
              {contextItems.map((item) => {
                const active = tenantContextLinkActive(pathname, item.href);
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition",
                      active
                        ? "border-[#151515] text-[#151515]"
                        : "border-transparent text-[#4a4a4a] hover:text-[#151515]",
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    {t(item.localizationKey, item.label)}
                  </Link>
                );
              })}
            </nav>
          )
        )}
        <main id="tenant-main-content">
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

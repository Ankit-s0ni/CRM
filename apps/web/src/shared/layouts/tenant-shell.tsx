"use client";

import {
  Bell,
  Building2,
  ChevronDown,
  Languages,
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
import type { AppLanguage } from "@/i18n/routing";
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
import { useTenantLocalization } from "@/lib/tenant-localization";
import { localizedTenantPath } from "@/lib/tenant-routes";

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

export function TenantShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, clearAuth, hasHydrated, setUser } = useAuthStore();
  const {
    t,
    direction,
    locale,
    enabledLanguages,
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
  return (
    <div className="min-h-screen bg-surface text-zinc-900">
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
          "fixed inset-y-0 start-0 z-50 flex w-[280px] flex-col bg-zinc-700 text-surface-variant shadow-xl transition-[width,transform] duration-200 lg:translate-x-0",
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
          className="absolute -end-3 top-6 z-10 hidden size-7 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:grid"
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
          <div className={cn(desktopCollapsed && "lg:hidden")}>
            <div className="text-lg font-bold text-zinc-100">
              {user.companyName || "DeltCRM"}
            </div>
            <div className="max-w-40 truncate text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-300">
              {t("tenant.shell.workspace", "DeltCRM workspace")}
            </div>
          </div>
          <button
            aria-label={t(
              "tenant.shell.closeNavigation",
              "Close navigation",
            )}
            className="ms-auto lg:hidden"
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
                  "flex min-h-10 items-center gap-4 rounded-lg border-s-4 px-4 py-2 text-sm transition",
                  desktopCollapsed &&
                    "lg:justify-center lg:gap-0 lg:px-2",
                  active
                    ? "border-zinc-200 bg-primary-container/25 text-zinc-200"
                    : "border-transparent text-zinc-300 hover:bg-white/5 hover:text-white",
                )}
                title={
                  desktopCollapsed
                    ? t(item.localizationKey, item.label)
                    : undefined
                }
              >
                <Icon className="size-[18px] shrink-0" />
                <span className={cn(desktopCollapsed && "lg:hidden")}>
                  {t(item.localizationKey, item.label)}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <button
            aria-label={t("tenant.shell.logout", "Logout")}
            className={cn(
              "flex h-10 w-full items-center gap-4 px-4 text-sm text-zinc-300 transition hover:text-white",
              desktopCollapsed && "lg:justify-center lg:gap-0 lg:px-0",
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
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-surface-variant bg-surface/95 px-4 shadow-sm backdrop-blur lg:px-6">
          <button
            aria-label={t(
              "tenant.shell.openNavigation",
              "Open navigation",
            )}
            className="me-3 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </button>
          <div className="hidden w-full sm:block">
            <PortalSearch />
          </div>
          <div className="ms-auto flex items-center gap-3 text-on-surface-variant sm:gap-5">
            {enabledLanguages.length > 1 && (
              <button
                aria-label={
                  locale === "en"
                    ? "Switch to Arabic"
                    : "Switch to English"
                }
                className="group flex min-h-11 items-center gap-2 rounded-full border border-surface-variant bg-white px-2.5 text-xs font-bold shadow-sm transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                onClick={() => {
                  const language: AppLanguage =
                    locale === "en" ? "ar" : "en";
                  const query = searchParams.toString();
                  document.cookie = `deltcrm-language=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
                  router.replace(
                    `${pathname}${query ? `?${query}` : ""}`,
                    { locale: language },
                  );
                }}
                title={
                  locale === "en"
                    ? "Switch to Arabic"
                    : "Switch to English"
                }
                type="button"
              >
                <Languages
                  aria-hidden="true"
                  className="size-4 text-primary"
                />
                <span
                  className={cn(
                    "rounded-full px-2 py-1 transition-colors",
                    locale === "en"
                      ? "bg-primary text-white"
                      : "text-on-surface-variant",
                  )}
                >
                  EN
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-1 transition-colors",
                    locale === "ar"
                      ? "bg-primary text-white"
                      : "text-on-surface-variant",
                  )}
                  lang="ar"
                >
                  عربي
                </span>
              </button>
            )}
            <Link
              aria-label={t(
                "tenant.shell.notifications",
                "Notifications",
              )}
              href="/app/notifications"
            >
              <Bell className="size-[18px]" />
            </Link>
            <HeaderContextHelp />
            <div className="h-6 w-px bg-surface-variant" />
            <div className="grid size-9 place-items-center rounded-full bg-primary-container text-xs font-bold text-white">
              {user.email.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-end sm:block">
              <div className="max-w-44 truncate text-xs font-semibold">
                {user.email}
              </div>
              <div className="text-[10px] text-outline">
                {user.roles?.[0]?.replaceAll("_", " ") ??
                  t("tenant.shell.workspaceUser", "Workspace user")}
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
              aria-label={t(
                "tenant.shell.contextNavigation",
                "{context} navigation",
                { context: currentContext ?? "" },
              )}
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
                    {t(item.localizationKey, item.label)}
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

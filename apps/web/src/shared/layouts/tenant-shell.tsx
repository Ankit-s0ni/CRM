"use client";

import {
  Bell,
  Boxes,
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import {
  resolvePlatformNavigationHref,
  usePlatformProductNavigation,
} from "@/lib/platform-product-navigation";
import { useTenantLocalization } from "@/lib/tenant-localization";
import { localizedTenantPath } from "@/lib/tenant-routes";
import { cn } from "@/lib/utils";
import { LanguageToggle } from "@/shared/components/language-toggle";
import { PortalSearch } from "@/shared/components/portal-search";
import { ThemeSwitcher } from "@/shared/components/theme-switcher";
import { focusRingClass } from "@/shared/components/page-primitives";

const SIDEBAR_STORAGE_KEY = "liqaa-sidebar-collapsed";
const SIDEBAR_CHANGE_EVENT = "liqaa:sidebar-change";

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
  const searchParams = useSearchParams();
  const { user, hasSession, clearAuth, hasHydrated, setUser } = useAuthStore();
  const { t, tText, direction, locale } = useTenantLocalization();
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktopCollapsed = useSyncExternalStore(
    subscribeToSidebarPreference,
    sidebarPreferenceSnapshot,
    sidebarPreferenceServerSnapshot,
  );
  const { items: contractNavigation } = usePlatformProductNavigation(hasSession);
  const userId = user?.id;

  useEffect(() => {
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
    document.documentElement.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow-y");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("overflow-y");
  }, [pathname]);

  useEffect(() => {
    if (!hasHydrated || hasSession) return;
    const query = searchParams.toString();
    const tenantPath = localizedTenantPath(
      `${pathname}${query ? `?${query}` : ""}`,
      locale,
    );
    window.location.replace(`/login?next=${encodeURIComponent(tenantPath)}`);
  }, [hasHydrated, hasSession, locale, pathname, searchParams]);

  useEffect(() => {
    if (!hasSession || !userId) return;
    apiClient
      .get<{
        user: { id: string; email: string; roles: string[]; permissions: string[] };
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
      .catch(() => clearAuth());
  }, [clearAuth, hasSession, setUser, userId]);

  if (!hasHydrated || !hasSession || !user) {
    return <div className="min-h-screen bg-surface" />;
  }

  const canOpenSettings = (user.permissions ?? []).some((permission) =>
    [
      "workspace.settings.read",
      "identity.roles.read",
      "notifications.self",
      "billing.subscription.read",
      "workspace.audit.read",
    ].includes(permission),
  );
  const productItems = contractNavigation.filter(
    ({ key, requiredProduct }) => key !== "home" && requiredProduct,
  );
  const navigation = [
    {
      key: "home",
      label: t("tenant.navigation.dashboard", "Dashboard"),
      href: `/${locale}/app`,
      icon: LayoutDashboard,
      product: false,
    },
    ...productItems.map((item) => {
      const isOnboardingPending =
        item.requiredProduct === "HRMS" && !user?.onboardingCompletedAt;
      return {
        key: item.key,
        label:
          item.requiredProduct === "HRMS"
            ? t("tenant.navigation.hrms", "HRMS")
            : item.requiredProduct ?? item.key,
        href: isOnboardingPending
          ? `/${locale}/app/hrms/onboarding`
          : resolvePlatformNavigationHref(item.hrefTemplate, locale),
        icon: Boxes,
        product: true,
      };
    }),
    ...(canOpenSettings
      ? [
          {
            key: "settings",
            label: t("tenant.navigation.settings", "Settings"),
            href: `/${locale}/app/settings`,
            icon: Settings2,
            product: false,
          },
        ]
      : []),
  ];

  function toggleDesktopSidebar() {
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      String(!desktopCollapsed),
    );
    window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT));
  }

  return (
    <div className="tenant-page min-h-screen text-foreground">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1200] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        href="#tenant-main-content"
      >
        {t("tenant.shell.skipToContent", "Skip to main content")}
      </a>
      {mobileOpen && (
        <button
          aria-label={t("tenant.shell.closeNavigation", "Close navigation")}
          className="fixed inset-0 z-40 bg-foreground/35 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "app-sidebar fixed inset-y-0 start-0 z-50 flex w-[280px] flex-col border-e border-border bg-background text-foreground shadow-lg transition-[width,transform] duration-200 lg:translate-x-0",
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
            "absolute -end-3 top-6 z-10 hidden size-7 place-items-center rounded-full border border-border bg-background text-foreground shadow-sm transition hover:bg-card lg:grid",
            focusRingClass,
          )}
          onClick={toggleDesktopSidebar}
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
          <div className="app-sidebar-avatar grid size-11 place-items-center overflow-hidden rounded-md border border-primary bg-background text-foreground">
            {user.logoUrl ? (
              <Image
                alt={`${user.companyName ?? "Workspace"} logo`}
                className="size-full bg-card object-contain p-1"
                height={40}
                src={user.logoUrl}
                unoptimized
                width={40}
              />
            ) : (
              <img src="/logo-square.png" alt="Liqaa Logo" className="size-full object-contain p-1" />
            )}
          </div>
          <div className={cn(desktopCollapsed && "lg:hidden")}>
            <div className="app-sidebar-title text-xl font-medium text-foreground">
              {user.companyName || tText("Liqaa")}
            </div>
            <div className="app-sidebar-subtitle max-w-40 truncate text-sm text-muted-foreground">
              {t("tenant.shell.workspace", "Liqaa workspace")}
            </div>
          </div>
          <button
            aria-label={t("tenant.shell.closeNavigation", "Close navigation")}
            className={cn("ms-auto rounded-lg p-2 text-foreground lg:hidden", focusRingClass)}
            onClick={() => setMobileOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          <div
            className={cn(
              "app-sidebar-section-label px-4 pb-4 pt-8 text-xs font-medium uppercase tracking-wider text-muted-foreground",
              desktopCollapsed && "lg:hidden",
            )}
          >
            {t("tenant.shell.mainNavigation", "Main navigation")}
          </div>
          {navigation.map((item) => {
            const active =
              item.key === "home"
                ? pathname === "/app"
                : pathname === item.href.replace(`/${locale}`, "") ||
                  pathname.startsWith(
                    `${item.href.replace(`/${locale}`, "")}/`,
                  );
            const Icon = item.icon;
            const content = (
              <>
                <Icon className="size-5 shrink-0 stroke-[1.7]" />
                <span className={cn(desktopCollapsed && "lg:hidden")}>
                  {item.label}
                </span>
              </>
            );
            const className = cn(
              "sidebar-nav-item flex min-h-14 items-center gap-4 rounded-md border px-4 py-2 text-base font-semibold transition",
              desktopCollapsed && "lg:justify-center lg:gap-0 lg:px-2",
              active
                ? "sidebar-nav-item-active border-border bg-card text-foreground shadow-sm"
                : "border-transparent text-foreground hover:border-outline hover:bg-card",
            );

            return item.product ? (
              <a
                aria-current={active ? "page" : undefined}
                className={className}
                href={item.href}
                key={item.key}
                onClick={() => setMobileOpen(false)}
                title={desktopCollapsed ? item.label : undefined}
              >
                {content}
              </a>
            ) : (
              <Link
                aria-current={active ? "page" : undefined}
                className={className}
                href={item.href.replace(`/${locale}`, "")}
                key={item.key}
                onClick={() => setMobileOpen(false)}
                title={desktopCollapsed ? item.label : undefined}
              >
                {content}
              </Link>
            );
          })}
        </nav>
        <div className="app-sidebar-divider border-t border-outline p-4">
          <button
            aria-label={t("tenant.shell.logout", "Logout")}
            className={cn(
              "sidebar-logout flex min-h-11 w-full items-center gap-4 rounded-md px-4 text-base font-medium text-foreground transition hover:bg-card",
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
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:px-6 xl:px-8">
          <button
            aria-label={t("tenant.shell.openNavigation", "Open navigation")}
            className={cn("me-3 rounded-lg p-2 text-foreground lg:hidden", focusRingClass)}
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </button>
          <div className="hidden min-w-0 flex-1 sm:block">
            <div className="w-full max-w-2xl">
              <PortalSearch />
            </div>
          </div>
          <div className="ms-auto flex shrink-0 items-center gap-1.5 text-foreground sm:gap-2">
            <LanguageToggle />
            <div className="hidden xl:block">
              <ThemeSwitcher />
            </div>
            <Link
              aria-label={t("tenant.shell.notifications", "Notifications")}
              className={cn(
                "grid size-10 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground",
                focusRingClass,
              )}
              href="/app/settings/notifications"
            >
              <Bell className="size-5" />
            </Link>
            <div className="mx-1 hidden h-8 w-px bg-border lg:block" />
            <div className="flex min-h-11 items-center gap-2 rounded-full py-1 ps-1 pe-2">
              <span className="grid size-9 place-items-center rounded-full border border-primary bg-background text-sm font-semibold text-foreground">
                {user.email.slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden min-w-0 text-start 2xl:block">
                <span className="block max-w-40 truncate text-sm font-semibold text-foreground">
                  {user.email}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {user.roles?.[0]?.replaceAll("_", " ") ??
                    t("tenant.shell.workspaceUser", "Workspace user")}
                </span>
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </div>
          </div>
        </header>
        <div className="border-b border-border bg-background px-4 py-3 sm:hidden">
          <PortalSearch />
        </div>
        <main id="tenant-main-content">{children}</main>
      </div>
    </div>
  );
}

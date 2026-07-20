"use client";

import { ChevronRight, LockKeyhole, Puzzle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FeatureInfo } from "@/components/help/feature-info";
import {
  attendanceBreadcrumbs,
  attendanceRouteAccessForPath,
  type AttendanceCapabilities,
  attendanceSectionForPath,
  attendanceSectionTabs,
  attendanceSetupTabsForPath,
  attendanceTabActive,
  attendanceWorkspaceItems,
  canUseAttendanceRoute,
} from "@/lib/attendance-navigation";
import { cn } from "@/lib/utils";

type AttendanceWorkspaceChromeProps = {
  permissions: readonly string[];
  capabilities: AttendanceCapabilities | null;
};

type AttendanceNavItem = (typeof attendanceWorkspaceItems)[number];

export function AttendanceWorkspaceChrome({
  permissions,
  capabilities,
}: AttendanceWorkspaceChromeProps) {
  const pathname = usePathname();
  const granted = new Set(permissions);
  const currentSection = attendanceSectionForPath(pathname);
  const workspaceItems = attendanceWorkspaceItems.filter((item) =>
    canUseAttendanceRoute(item, granted, capabilities),
  );
  const sectionItems = currentSection
    ? (attendanceSectionTabs[currentSection] ?? []).filter((item) =>
        canUseAttendanceRoute(item, granted, capabilities),
      )
    : [];
  const setupFeatureItems = attendanceSetupTabsForPath(pathname).filter(
    (item) => canUseAttendanceRoute(item, granted, capabilities),
  );
  const breadcrumbs = attendanceBreadcrumbs(pathname);

  return (
    <>
      <AttendanceWorkspaceNav
        capabilities={capabilities}
        currentSection={currentSection}
        items={workspaceItems}
        permissions={permissions}
      />

      {sectionItems.length > 1 && (
        <nav
          aria-label={`${currentSection} section`}
          className="flex min-h-12 items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-zinc-50 px-4 lg:px-7"
        >
          {sectionItems.map((item) => {
            const active = attendanceTabActive(pathname, item.href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition",
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
      )}

      {setupFeatureItems.length > 1 && (
        <AttendanceSectionTabs
          ariaLabel="Attendance setup features"
          items={setupFeatureItems}
          pathname={pathname}
        />
      )}

      {breadcrumbs.length > 1 && <AttendanceBreadcrumbs items={breadcrumbs} />}
    </>
  );
}

export function AttendanceWorkspaceNav({
  capabilities,
  currentSection,
  items,
  permissions,
}: AttendanceWorkspaceChromeProps & {
  currentSection: ReturnType<typeof attendanceSectionForPath>;
  items: readonly AttendanceNavItem[];
}) {
  return (
    <nav
      aria-label="Attendance workspace"
      className="sticky top-16 z-20 flex min-h-14 items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-3 shadow-sm lg:px-6"
    >
      {items.map((item) => {
        const active = currentSection === item.section;
        return (
          <div
            className={cn(
              "flex shrink-0 items-center rounded-lg",
              active && "bg-zinc-50",
            )}
            key={item.href}
          >
            <PermissionAwareLink
              active={active}
              capabilities={capabilities}
              item={item}
              permissions={permissions}
            >
              {item.label}
            </PermissionAwareLink>
            <FeatureInfo
              className="mr-1 min-h-9 min-w-9"
              helpKey={item.helpKey}
            />
          </div>
        );
      })}
    </nav>
  );
}

export function AttendanceBreadcrumbs({
  items,
}: {
  items: ReturnType<typeof attendanceBreadcrumbs>;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 overflow-x-auto px-5 pt-5 text-xs text-outline lg:px-8"
    >
      {items.map((crumb, index) => (
        <div
          className="flex shrink-0 items-center gap-1"
          key={`${crumb.href}-${crumb.label}`}
        >
          {index > 0 && <ChevronRight className="size-3" />}
          {index === items.length - 1 ? (
            <span aria-current="page" className="font-semibold text-on-surface-variant">
              {crumb.label}
            </span>
          ) : (
            <Link className="hover:text-primary" href={crumb.href}>
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

export function PermissionAwareLink({
  active,
  capabilities,
  children,
  item,
  permissions,
}: AttendanceWorkspaceChromeProps & {
  active: boolean;
  children: React.ReactNode;
  item: AttendanceNavItem;
}) {
  if (!canUseAttendanceRoute(item, new Set(permissions), capabilities)) {
    return null;
  }
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "whitespace-nowrap px-3 py-3 text-sm font-semibold transition",
        active ? "text-primary" : "text-on-surface-variant hover:text-zinc-700",
      )}
      href={item.href}
    >
      {children}
    </Link>
  );
}

export function CapabilityGate({
  allowed,
  children,
  fallback = null,
}: {
  allowed: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return allowed ? children : fallback;
}

export function AttendanceRouteGate({
  attendanceEnabled,
  capabilities,
  capabilitiesLoaded,
  children,
  modulesLoaded,
  permissions,
}: AttendanceWorkspaceChromeProps & {
  attendanceEnabled: boolean;
  capabilitiesLoaded: boolean;
  children: React.ReactNode;
  modulesLoaded: boolean;
}) {
  const pathname = usePathname();
  const route = attendanceRouteAccessForPath(pathname);

  if (!modulesLoaded || (route?.requiresField && !capabilitiesLoaded)) {
    return <AttendanceGateState state="loading" />;
  }
  if (!attendanceEnabled) {
    return <AttendanceGateState state="module-unavailable" />;
  }
  return (
    <CapabilityGate
      allowed={
        !route ||
        canUseAttendanceRoute(route, new Set(permissions), capabilities)
      }
      fallback={<AttendanceGateState state="forbidden" />}
    >
      {children}
    </CapabilityGate>
  );
}

function AttendanceGateState({
  state,
}: {
  state: "loading" | "module-unavailable" | "forbidden";
}) {
  if (state === "loading") {
    return (
      <div
        aria-label="Checking Attendance access"
        className="mx-auto max-w-5xl p-6"
        role="status"
      >
        <div className="h-40 animate-pulse rounded-2xl border border-surface-variant bg-white" />
      </div>
    );
  }
  const unavailable = state === "module-unavailable";
  const Icon = unavailable ? Puzzle : LockKeyhole;
  return (
    <section
      className="mx-auto mt-8 max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm"
      role="alert"
    >
      <span className="mx-auto grid size-12 place-items-center rounded-xl bg-zinc-50 text-primary">
        <Icon className="size-6" />
      </span>
      <h1 className="mt-4 text-2xl font-bold">
        {unavailable ? "Attendance is unavailable" : "Attendance access denied"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">
        {unavailable
          ? "This workspace does not currently have the Attendance module enabled."
          : "Your current workspace permissions do not allow this Attendance area."}
      </p>
      <Link
        className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-bold text-white"
        href="/app/modules"
      >
        Back to modules
      </Link>
    </section>
  );
}

export function AttendanceSectionTabs({
  ariaLabel,
  items,
  pathname,
}: {
  ariaLabel: string;
  items: ReturnType<typeof attendanceSetupTabsForPath>;
  pathname: string;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className="flex min-h-11 items-center gap-1 overflow-x-auto border-b border-zinc-100 bg-white px-5 lg:px-8"
    >
      {items.map((item) => {
        const active = attendanceTabActive(pathname, item.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              active
                ? "bg-zinc-700 text-white"
                : "text-on-surface-variant hover:bg-zinc-50 hover:text-primary",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

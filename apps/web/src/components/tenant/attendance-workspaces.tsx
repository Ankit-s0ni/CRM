"use client";

import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileSpreadsheet,
  LockKeyhole,
  MapPinned,
  MonitorSmartphone,
  RefreshCw,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FeatureInfo } from "@/components/help/feature-info";
import { Button } from "@/components/ui/button";
import type { AttendanceHelpKey } from "@/content/attendance-help";
import { apiClient } from "@/lib/api-client";
import {
  type AttendanceCapabilities,
  attendanceSectionTabs,
  canUseAttendanceRoute,
} from "@/lib/attendance-navigation";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import {
  AdminPage,
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
} from "./page-primitives";

type DashboardData = {
  date: string;
  summary: {
    present: number;
    late: number;
    absent: number;
    onField: number;
  };
  attention: {
    pendingRegularizations: number;
    openSecurityViolations: number;
    absenteeAlerts: number;
  };
  updatedAt: string;
};

type RegisterResponse = {
  data: Array<{ firstCheckin: string | null; lastCheckout: string | null }>;
  summary: { statuses: Record<string, number | undefined> };
};

type OverviewData = {
  dashboard?: DashboardData;
  register?: RegisterResponse;
  odWfh: number;
  pendingRegularizations: number;
  pendingDevices: number;
  criticalAlerts: number;
  staleFieldSessions: number;
  setup: {
    policies?: number;
    assignedPolicies?: number;
    shifts?: number;
    rosters?: number;
    offices?: number;
    activeDevices?: number;
    pendingDevices?: number;
    biometricAvailable?: boolean;
    fieldTrackingEnabled?: boolean;
    runtimeConfigVersion?: number;
  };
  monthEnd: { completedReports?: number; activeLocks?: number };
  unavailable: string[];
};

type ScopeOption = { id: string; name?: string; officeName?: string };

const today = () => new Date().toLocaleDateString("en-CA");

export function AttendanceOverview() {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const granted = new Set(permissions);
  const [date, setDate] = useState(today);
  const [departmentId, setDepartmentId] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [departments, setDepartments] = useState<ScopeOption[]>([]);
  const [offices, setOffices] = useState<ScopeOption[]>([]);
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    loadOverview(new Set(permissions), date, departmentId, officeId)
      .then((next) => {
        if (active) setData(next);
      })
      .catch(() => {
        if (active)
          setError(
            "Attendance priorities could not be loaded. Try refreshing the workspace.",
          );
      });
    return () => {
      active = false;
    };
  }, [date, departmentId, officeId, refreshKey, permissions]);

  useEffect(() => {
    let active = true;
    Promise.all([
      optional<{ data: ScopeOption[] }>(
        permissions.includes("organization.departments.read"),
        "/departments",
      ),
      optional<{ data: ScopeOption[] }>(
        permissions.includes("attendance.offices.read") ||
          permissions.includes("attendance.offices.manage"),
        "/offices",
      ),
    ]).then(([departmentResult, officeResult]) => {
      if (!active) return;
      setDepartments(departmentResult?.data ?? []);
      setOffices(officeResult?.data ?? []);
    });
    return () => {
      active = false;
    };
  }, [permissions]);

  const summary = data?.dashboard?.summary;
  const registerStatuses = data?.register?.summary.statuses;
  const missingCheckout =
    data?.register?.data.filter(
      ({ firstCheckin, lastCheckout }) => firstCheckin && !lastCheckout,
    ).length ?? 0;
  const summaryCards = [
    {
      label: "Present",
      value: summary?.present ?? registerStatuses?.PRESENT ?? 0,
      href: registerMetricHref(date, departmentId, officeId, {
        status: "PRESENT",
      }),
      tone: "success",
    },
    {
      label: "Absent",
      value: summary?.absent ?? registerStatuses?.ABSENT ?? 0,
      href: registerMetricHref(date, departmentId, officeId, {
        status: "ABSENT",
      }),
      tone: "danger",
    },
    {
      label: "Late",
      value: summary?.late ?? 0,
      href: registerMetricHref(date, departmentId, officeId, {
        lateOnly: "true",
      }),
      tone: "warning",
    },
    {
      label: "Missing checkout",
      value: missingCheckout,
      href: registerMetricHref(date, departmentId, officeId, {
        missingCheckout: "true",
      }),
      tone: "warning",
    },
    {
      label: "On leave",
      value: registerStatuses?.ON_LEAVE ?? 0,
      href: registerMetricHref(date, departmentId, officeId, {
        status: "ON_LEAVE",
      }),
      tone: "neutral",
    },
  ] as const;

  return (
    <AdminPage
      title="Attendance overview"
      description="See today's workforce state, urgent queues, setup health, and month-end readiness in one place."
      action={
        <div className="flex flex-wrap items-center gap-2">
          {departments.length > 0 && (
            <select
              aria-label="Department scope"
              className="h-10 rounded-lg border border-[#c8c5d0] bg-white px-3 text-sm"
              onChange={(event) => setDepartmentId(event.target.value)}
              value={departmentId}
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          )}
          {offices.length > 0 && (
            <select
              aria-label="Office scope"
              className="h-10 rounded-lg border border-[#c8c5d0] bg-white px-3 text-sm"
              onChange={(event) => setOfficeId(event.target.value)}
              value={officeId}
            >
              <option value="">All offices</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.officeName}
                </option>
              ))}
            </select>
          )}
          <label className="text-xs font-bold text-[#646273]">
            Operational date
            <input
              aria-label="Operational date"
              className="ml-2 h-10 rounded-lg border border-[#c8c5d0] bg-white px-3 text-sm"
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
          </label>
          <Button
            aria-label="Refresh Attendance overview"
            className="size-10"
            onClick={() => setRefreshKey((value) => value + 1)}
            size="icon"
            variant="outline"
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      }
    >
      {error && <ErrorState message={error} />}
      {!data ? (
        <LoadingState />
      ) : (
        <div className="space-y-6">
          <section aria-labelledby="today-summary-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold" id="today-summary-heading">
                  Today summary
                </h2>
                <p className="text-sm text-[#646273]">
                  Each metric opens the register with the matching date and
                  filter.
                </p>
              </div>
              {data.dashboard?.updatedAt && (
                <span className="text-xs text-[#777587]">
                  Updated{" "}
                  {new Intl.DateTimeFormat("en", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(data.dashboard.updatedAt))}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {summaryCards.map((item) => (
                <SummaryCard {...item} key={item.label} />
              ))}
            </div>
          </section>

          <div className="grid items-start gap-6 xl:grid-cols-[1.35fr_.65fr]">
            <AttentionQueue data={data} permissions={granted} />
            <QuickActions permissions={granted} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SetupHealth data={data.setup} permissions={granted} />
            <MonthEndReadiness data={data.monthEnd} permissions={granted} />
          </div>

          {data.unavailable.length > 0 && (
            <p className="rounded-xl border border-[#e4e1ee] bg-white px-4 py-3 text-xs text-[#646273]">
              Some optional summaries are unavailable for this role or
              temporarily offline. Available data is shown without replacing
              missing values with estimates.
            </p>
          )}
        </div>
      )}
    </AdminPage>
  );
}

export function AttendanceRequestsEntry() {
  const router = useRouter();
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const available = (attendanceSectionTabs.requests ?? []).filter((item) =>
    canUseAttendanceRoute(item, new Set(permissions), null),
  );

  useEffect(() => {
    if (hasHydrated && available[0]) router.replace(available[0].href);
  }, [available, hasHydrated, router]);

  if (!hasHydrated || available.length) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <LoadingState />
      </div>
    );
  }
  return (
    <AdminPage
      title="Requests"
      description="Review attendance requests permitted for your role."
    >
      <Panel>
        <EmptyState
          title="No request queues available"
          body="Your role does not include OD/WFH or attendance correction review."
        />
      </Panel>
    </AdminPage>
  );
}

type SetupGroup = {
  title: string;
  description: string;
  icon: typeof Settings2;
  helpKey: AttendanceHelpKey;
  links: Array<{ label: string; href: string; permissions: string[] }>;
};

const setupGroups: SetupGroup[] = [
  {
    title: "Rules & verification",
    description:
      "Define employee app prompts, verification requirements, and effective attendance policies.",
    icon: SlidersHorizontal,
    helpKey: "policies",
    links: [
      {
        label: "Attendance policies",
        href: "/app/attendance/policies",
        permissions: ["attendance.policies.read", "attendance.policies.manage"],
      },
    ],
  },
  {
    title: "Work schedule",
    description:
      "Create reusable shifts and assign employee-specific roster dates.",
    icon: CalendarClock,
    helpKey: "rosters",
    links: [
      {
        label: "Shifts",
        href: "/app/attendance/shifts",
        permissions: ["attendance.shifts.read", "attendance.shifts.manage"],
      },
      {
        label: "Rosters",
        href: "/app/attendance/rosters",
        permissions: ["attendance.rosters.read", "attendance.rosters.manage"],
      },
    ],
  },
  {
    title: "Workplaces & calendar",
    description:
      "Manage office geofences, trusted networks, assignments, and holidays.",
    icon: Building2,
    helpKey: "offices",
    links: [
      {
        label: "Offices",
        href: "/app/attendance/offices",
        permissions: ["attendance.offices.read", "attendance.offices.manage"],
      },
      {
        label: "Holidays",
        href: "/app/attendance/holidays",
        permissions: ["attendance.holidays.read", "attendance.holidays.manage"],
      },
    ],
  },
  {
    title: "Trust & devices",
    description:
      "Approve employee devices and investigate attendance verification signals.",
    icon: MonitorSmartphone,
    helpKey: "devices",
    links: [
      {
        label: "Devices",
        href: "/app/attendance/devices",
        permissions: ["attendance.devices.read", "attendance.devices.manage"],
      },
      {
        label: "Security feed",
        href: "/app/attendance/security",
        permissions: [
          "attendance.security-alerts.read",
          "attendance.security-alerts.manage",
        ],
      },
    ],
  },
];

export function AttendanceSetupIndex() {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const granted = new Set(permissions);
  const [capabilities, setCapabilities] =
    useState<AttendanceCapabilities | null>(null);
  const [health, setHealth] = useState<OverviewData["setup"]>({});

  useEffect(() => {
    let active = true;
    const currentPermissions = new Set(permissions);
    Promise.all([
      optional<{ data: AttendanceCapabilities }>(
        currentPermissions.has("attendance.config.read") ||
          currentPermissions.has("attendance.config.manage"),
        "/workspace/attendance-capabilities",
      ),
      setupHealth(currentPermissions),
      optional<{ data: Array<{ status: string }> }>(
        currentPermissions.has("attendance.devices.read") ||
          currentPermissions.has("attendance.devices.manage"),
        "/devices?limit=100",
      ),
    ]).then(([capabilityResult, healthResult, deviceResult]) => {
      if (!active) return;
      setCapabilities(capabilityResult?.data ?? null);
      setHealth({
        ...healthResult,
        activeDevices: deviceResult?.data.filter(
          ({ status }) => status === "ACTIVE",
        ).length,
        pendingDevices: deviceResult?.data.filter(
          ({ status }) => status === "PENDING_APPROVAL",
        ).length,
      });
    });
    return () => {
      active = false;
    };
  }, [permissions]);

  const visibleGroups = setupGroups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) =>
        link.permissions.some((permission) => granted.has(permission)),
      ),
    }))
    .filter((group) => group.links.length);

  return (
    <AdminPage
      title="Attendance setup"
      description="Configure attendance in four guided areas. Daily operations remain separate from setup work."
    >
      {capabilities &&
        !capabilities.fieldTrackingEntitled &&
        granted.has("billing.subscription.manage") && (
          <div className="mb-6 flex gap-3 rounded-xl border border-[#d9d5e5] bg-[#f5f2ff] p-4">
            <LockKeyhole className="mt-0.5 size-5 shrink-0 text-[#3525cd]" />
            <div>
              <p className="text-sm font-bold">
                Field Tracking is not included in this workspace
              </p>
              <p className="mt-1 text-sm text-[#646273]">
                Business Admins can review the subscription with the DeltCRM
                owner. HR users will continue to see only capabilities already
                available to the workspace.
              </p>
            </div>
          </div>
        )}
      <div className="grid gap-5 lg:grid-cols-2">
        {visibleGroups.map((group) => (
          <SetupGroupCard group={group} health={health} key={group.title} />
        ))}
      </div>
      {!visibleGroups.length && (
        <Panel>
          <EmptyState
            title="No Attendance setup access"
            body="Your role can use operational Attendance features but cannot change workspace configuration."
          />
        </Panel>
      )}
    </AdminPage>
  );
}

function SummaryCard({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone: "success" | "danger" | "warning" | "neutral";
}) {
  const styles = {
    success: "border-[#bce9ca] bg-[#f1fbf4] text-[#006e2d]",
    danger: "border-[#ffc8c2] bg-[#fff4f2] text-[#9f1111]",
    warning: "border-[#f2d29e] bg-[#fff9ed] text-[#895100]",
    neutral: "border-[#d9d5e5] bg-white text-[#3525cd]",
  };
  return (
    <Link
      className={cn(
        "rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        styles[tone],
      )}
      href={href}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs font-semibold">{label}</div>
    </Link>
  );
}

export function AttentionQueue({
  data,
  permissions,
}: {
  data: OverviewData;
  permissions: ReadonlySet<string>;
}) {
  const items = [
    (permissions.has("attendance.regularizations.manage") ||
      permissions.has("attendance.approvals.manage")) && {
      label: "Pending corrections",
      value: data.pendingRegularizations,
      href: "/app/attendance/regularizations?status=PENDING",
      icon: ClipboardCheck,
      helpKey: "regularizations" as const,
    },
    permissions.has("attendance.exceptions.read") && {
      label: "OD & WFH records",
      value: data.odWfh,
      href: "/app/attendance/exceptions",
      icon: CalendarCheck2,
      helpKey: "exceptions" as const,
    },
    permissions.has("attendance.devices.read") && {
      label: "Devices awaiting approval",
      value: data.pendingDevices,
      href: "/app/attendance/devices?status=PENDING_APPROVAL",
      icon: MonitorSmartphone,
      helpKey: "devices" as const,
    },
    permissions.has("attendance.security-alerts.read") && {
      label: "Critical open alerts",
      value: data.criticalAlerts,
      href: "/app/attendance/security?status=OPEN&severity=CRITICAL",
      icon: ShieldAlert,
      helpKey: "security-feed" as const,
    },
    (permissions.has("attendance.field.live.read") ||
      permissions.has("attendance.field.routes.read")) && {
      label: "Stale field sessions",
      value: data.staleFieldSessions,
      href: "/app/attendance/field?presence=STALE",
      icon: MapPinned,
      helpKey: "field" as const,
    },
  ].filter(Boolean) as Array<{
    label: string;
    value: number;
    href: string;
    icon: typeof ClipboardCheck;
    helpKey: AttendanceHelpKey;
  }>;
  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-[#e4e1ee] p-5">
        <h2 className="text-lg font-bold">Needs attention</h2>
        <p className="text-sm text-[#646273]">
          Open the queue that needs action instead of searching across screens.
        </p>
      </div>
      <div className="divide-y divide-[#ece8f1]">
        {items.map((item) => (
          <AttendanceTaskCard {...item} key={item.label} />
        ))}
        {!items.length && (
          <EmptyState
            title="No review queues"
            body="This role has no Attendance approval or investigation queues."
          />
        )}
      </div>
    </Panel>
  );
}

export function AttendanceTaskCard({
  helpKey,
  href,
  icon: Icon,
  label,
  value,
}: {
  helpKey: AttendanceHelpKey;
  href: string;
  icon: typeof ClipboardCheck;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-h-16 items-center gap-3 px-5 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f0ecf9] text-[#3525cd]">
        <Icon className="size-4" />
      </span>
      <Link
        className="min-w-0 flex-1 font-semibold hover:text-[#3525cd]"
        href={href}
      >
        {label}
      </Link>
      <FeatureInfo className="min-h-10 min-w-10" helpKey={helpKey} />
      <span
        className={cn(
          "grid min-w-8 place-items-center rounded-full px-2 py-1 text-xs font-bold",
          value ? "bg-[#ffddb0] text-[#895100]" : "bg-[#d8f8df] text-[#006e2d]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function QuickActions({ permissions }: { permissions: ReadonlySet<string> }) {
  const actions = [
    permissions.has("attendance.records.read") && {
      label: "Open register",
      href: "/app/attendance/register",
      icon: UsersRound,
    },
    (permissions.has("attendance.exceptions.read") ||
      permissions.has("attendance.regularizations.manage") ||
      permissions.has("attendance.approvals.manage")) && {
      label: "Review requests",
      href: "/app/attendance/requests",
      icon: ClipboardCheck,
    },
    (permissions.has("attendance.reports.read") ||
      permissions.has("attendance.reports.generate")) && {
      label: "Generate report",
      href: "/app/attendance/reports",
      icon: FileSpreadsheet,
    },
    permissions.has("attendance.policies.manage") && {
      label: "Add policy",
      href: "/app/attendance/policies",
      icon: SlidersHorizontal,
    },
  ].filter(Boolean) as Array<{
    label: string;
    href: string;
    icon: typeof UsersRound;
  }>;
  return (
    <Panel className="p-5">
      <h2 className="text-lg font-bold">Quick actions</h2>
      <div className="mt-4 grid gap-2">
        {actions.map(({ label, href, icon: Icon }) => (
          <Link
            className="flex min-h-11 items-center gap-3 rounded-lg border border-[#e4e1ee] px-4 text-sm font-semibold transition hover:border-[#3525cd] hover:bg-[#f8f5ff]"
            href={href}
            key={href}
          >
            <Icon className="size-4 text-[#3525cd]" />
            {label}
            <ArrowRight className="ml-auto size-4 text-[#aaa3ad]" />
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function SetupHealth({
  data,
  permissions,
}: {
  data: OverviewData["setup"];
  permissions: ReadonlySet<string>;
}) {
  if (
    ![
      "attendance.config.read",
      "attendance.policies.read",
      "attendance.shifts.read",
      "attendance.offices.read",
    ].some((permission) => permissions.has(permission))
  )
    return null;
  const checks = [
    {
      label: "Policies",
      value: data.policies,
      ready: Boolean(data.policies),
      icon: ClipboardCheck,
    },
    {
      label: "Policies assigned",
      value:
        data.assignedPolicies === undefined || data.policies === undefined
          ? undefined
          : `${data.assignedPolicies}/${data.policies}`,
      ready: Boolean(data.assignedPolicies),
      icon: CheckCircle2,
    },
    {
      label: "Shifts",
      value: data.shifts,
      ready: Boolean(data.shifts),
      icon: Clock3,
    },
    {
      label: "Upcoming rosters",
      value: data.rosters,
      ready: Boolean(data.rosters),
      icon: CalendarClock,
    },
    {
      label: "Office geofences",
      value: data.offices,
      ready: Boolean(data.offices),
      icon: Building2,
    },
    {
      label: "Trusted devices",
      value:
        data.activeDevices === undefined
          ? undefined
          : `${data.activeDevices} active${data.pendingDevices ? ` · ${data.pendingDevices} pending` : ""}`,
      ready: Boolean(data.activeDevices) && !data.pendingDevices,
      icon: MonitorSmartphone,
    },
    {
      label: "Biometric readiness",
      value:
        data.biometricAvailable === undefined
          ? undefined
          : data.biometricAvailable
            ? "Available"
            : "Not configured",
      ready: data.biometricAvailable === true,
      icon: ShieldAlert,
    },
    {
      label: "Mobile runtime",
      value:
        data.runtimeConfigVersion === undefined
          ? undefined
          : `Version ${data.runtimeConfigVersion}${data.fieldTrackingEnabled ? " · field on" : ""}`,
      ready: data.runtimeConfigVersion !== undefined,
      icon: SlidersHorizontal,
    },
  ].filter(({ value }) => value !== undefined);
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Setup health</h2>
          <p className="text-sm text-[#646273]">
            Core configuration reported by current setup APIs.
          </p>
        </div>
        <Link
          className="text-xs font-bold text-[#3525cd]"
          href="/app/attendance/setup"
        >
          Open setup
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
        {checks.map(({ label, value, ready, icon: Icon }) => (
          <div className="rounded-lg bg-[#f7f4fb] p-3" key={label}>
            <div className="flex items-center gap-2">
              <Icon
                className={cn(
                  "size-4",
                  ready ? "text-[#006e2d]" : "text-[#895100]",
                )}
              />
              <span className="text-xs font-semibold">{label}</span>
            </div>
            <p className="mt-2 text-base font-bold">{value}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function MonthEndReadiness({
  data,
  permissions,
}: {
  data: OverviewData["monthEnd"];
  permissions: ReadonlySet<string>;
}) {
  const canReports =
    permissions.has("attendance.reports.read") ||
    permissions.has("attendance.reports.generate");
  const canPayroll = permissions.has("attendance.payroll-lock.manage");
  if (!canReports && !canPayroll) return null;
  return (
    <Panel className="p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-[#302f39] text-white">
          <LockKeyhole className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold">Month-end readiness</h2>
          <p className="text-sm text-[#646273]">
            Confirm a completed export before locking attendance for payroll.
          </p>
        </div>
        <FeatureInfo className="ml-auto" helpKey="payroll-lock" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-[#f7f4fb] p-3">
          <p className="text-xs text-[#646273]">Completed reports</p>
          <p className="mt-1 text-xl font-bold">
            {data.completedReports ?? "—"}
          </p>
        </div>
        <div className="rounded-lg bg-[#f7f4fb] p-3">
          <p className="text-xs text-[#646273]">Active payroll locks</p>
          <p className="mt-1 text-xl font-bold">{data.activeLocks ?? "—"}</p>
        </div>
      </div>
      <Link
        className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#3525cd]"
        href={
          canPayroll ? "/app/attendance/payroll" : "/app/attendance/reports"
        }
      >
        {canPayroll ? "Review payroll close" : "Open reports"}
        <ArrowRight className="size-4" />
      </Link>
    </Panel>
  );
}

function SetupGroupCard({
  group,
  health,
}: {
  group: SetupGroup;
  health: OverviewData["setup"];
}) {
  const Icon = group.icon;
  const status = setupStatus(group.title, health);
  return (
    <Panel className="p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-[#302f39] text-white">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">{group.title}</h2>
            <SetupHealthBadge status={status} />
          </div>
          <p className="mt-1 text-sm leading-6 text-[#646273]">
            {group.description}
          </p>
        </div>
        <FeatureInfo helpKey={group.helpKey} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {group.links.map((link) => (
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d9d5e5] bg-white px-4 text-sm font-semibold text-[#3525cd] hover:bg-[#f5f2ff]"
            href={link.href}
            key={link.href}
          >
            {link.label}
            <ArrowRight className="size-3.5" />
          </Link>
        ))}
      </div>
    </Panel>
  );
}

export function SetupHealthBadge({
  status,
}: {
  status: "ready" | "attention" | "unknown";
}) {
  const values = {
    ready: ["Ready", "bg-[#d8f8df] text-[#006e2d]"],
    attention: ["Needs setup", "bg-[#ffddb0] text-[#895100]"],
    unknown: ["Review", "bg-[#ece9f2] text-[#646273]"],
  } as const;
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
        values[status][1],
      )}
    >
      {values[status][0]}
    </span>
  );
}

function setupStatus(
  title: string,
  health: OverviewData["setup"],
): "ready" | "attention" | "unknown" {
  const value = title.startsWith("Rules")
    ? health.policies
    : title.startsWith("Work schedule")
      ? (health.rosters ?? health.shifts)
      : title.startsWith("Workplaces")
        ? health.offices
        : health.activeDevices;
  return value === undefined ? "unknown" : value > 0 ? "ready" : "attention";
}

async function loadOverview(
  permissions: ReadonlySet<string>,
  date: string,
  departmentId: string,
  officeId: string,
): Promise<OverviewData> {
  const dashboardParams = new URLSearchParams({ date, limit: "1" });
  const registerParams = new URLSearchParams({
    startDate: date,
    endDate: date,
    page: "1",
    limit: "100",
  });
  if (departmentId) {
    dashboardParams.set("departmentId", departmentId);
    registerParams.set("departmentId", departmentId);
  }
  if (officeId) {
    dashboardParams.set("officeId", officeId);
    registerParams.set("officeId", officeId);
  }
  const results = await Promise.all([
    optional<{ data: DashboardData }>(
      permissions.has("attendance.records.read") &&
        permissions.has("organization.employees.read"),
      `/attendance/dashboard?${dashboardParams}`,
    ),
    optional<RegisterResponse>(
      permissions.has("attendance.records.read"),
      `/attendance/register?${registerParams}`,
    ),
    optional<{ pagination: { total: number } }>(
      permissions.has("attendance.exceptions.read"),
      "/attendance-exceptions?page=1&limit=1",
    ),
    optional<{ data: unknown[] }>(
      permissions.has("attendance.regularizations.manage") ||
        permissions.has("attendance.approvals.manage"),
      "/regularizations?status=PENDING&page=1&limit=100",
    ),
    optional<{ data: Array<{ status: string }> }>(
      permissions.has("attendance.devices.read"),
      "/devices?limit=100",
    ),
    optional<{ data: Array<{ severity: string }>; meta?: { total: number } }>(
      permissions.has("attendance.security-alerts.read"),
      "/security-alerts?status=OPEN&severity=CRITICAL&page=1&limit=100",
    ),
    optional<{ data: Array<{ presence: string }> }>(
      permissions.has("attendance.field.live.read"),
      "/field/employees/live",
    ),
    setupHealth(permissions),
    optional<{ data: unknown[] }>(
      permissions.has("attendance.reports.read") ||
        permissions.has("attendance.reports.generate"),
      "/reports?status=COMPLETED&page=1&limit=100",
    ),
    optional<{ data: Array<{ status?: string }> }>(
      permissions.has("attendance.payroll-lock.manage"),
      "/payroll-locks",
    ),
  ]);
  const [
    dashboard,
    register,
    exceptions,
    regularizations,
    devices,
    alerts,
    field,
    setup,
    reports,
    locks,
  ] = results;
  return {
    dashboard: dashboard?.data,
    register: register ?? undefined,
    odWfh: exceptions?.pagination.total ?? 0,
    pendingRegularizations:
      regularizations?.data.length ??
      dashboard?.data.attention.pendingRegularizations ??
      0,
    pendingDevices:
      devices?.data.filter(({ status }) => status === "PENDING_APPROVAL")
        .length ?? 0,
    criticalAlerts:
      alerts?.meta?.total ??
      alerts?.data.length ??
      dashboard?.data.attention.openSecurityViolations ??
      0,
    staleFieldSessions:
      field?.data.filter(({ presence }) => presence === "STALE").length ?? 0,
    setup: {
      ...setup,
      activeDevices: devices?.data.filter(({ status }) => status === "ACTIVE")
        .length,
      pendingDevices: devices?.data.filter(
        ({ status }) => status === "PENDING_APPROVAL",
      ).length,
    },
    monthEnd: {
      completedReports: reports?.data.length,
      activeLocks: locks?.data.filter(
        ({ status }) => !status || status === "LOCKED",
      ).length,
    },
    unavailable: results
      .map((value, index) => (value === undefined ? String(index) : ""))
      .filter(Boolean),
  };
}

function registerMetricHref(
  date: string,
  departmentId: string,
  officeId: string,
  filter: Record<string, string>,
) {
  const params = new URLSearchParams({
    startDate: date,
    endDate: date,
    ...filter,
  });
  if (departmentId) params.set("departmentId", departmentId);
  if (officeId) params.set("officeId", officeId);
  return `/app/attendance/register?${params}`;
}

async function setupHealth(permissions: ReadonlySet<string>) {
  const startDate = today();
  const rosterEnd = new Date(`${startDate}T12:00:00`);
  rosterEnd.setDate(rosterEnd.getDate() + 13);
  const endDate = rosterEnd.toLocaleDateString("en-CA");
  const [policies, shifts, rosters, offices, capabilities] = await Promise.all([
    optional<{ data: Array<{ assignments?: unknown[] }> }>(
      permissions.has("attendance.policies.read") ||
        permissions.has("attendance.policies.manage"),
      "/attendance-policies",
    ),
    optional<{ data: unknown[] }>(
      permissions.has("attendance.shifts.read") ||
        permissions.has("attendance.shifts.manage"),
      "/shifts",
    ),
    optional<{ data: unknown[] }>(
      permissions.has("attendance.rosters.read") ||
        permissions.has("attendance.rosters.manage"),
      `/rosters?startDate=${startDate}&endDate=${endDate}`,
    ),
    optional<{ data: unknown[] }>(
      permissions.has("attendance.offices.read") ||
        permissions.has("attendance.offices.manage"),
      "/offices",
    ),
    optional<{
      data: AttendanceCapabilities & { runtimeConfigVersion?: number };
    }>(
      permissions.has("attendance.config.read") ||
        permissions.has("attendance.config.manage"),
      "/workspace/attendance-capabilities",
    ),
  ]);
  return {
    policies: policies?.data.length,
    assignedPolicies: policies?.data.filter(
      ({ assignments }) => assignments?.length,
    ).length,
    shifts: shifts?.data.length,
    rosters: rosters?.data.length,
    offices: offices?.data.length,
    biometricAvailable: capabilities?.data.biometricEnforcementAvailable,
    fieldTrackingEnabled: capabilities?.data.fieldTrackingEnabled,
    runtimeConfigVersion: capabilities?.data.runtimeConfigVersion,
  };
}

async function optional<T>(
  enabled: boolean,
  url: string,
): Promise<T | undefined> {
  if (!enabled) return undefined;
  try {
    const response = await apiClient.get<T>(url);
    return response.data;
  } catch {
    return undefined;
  }
}

"use client";

import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  FileBarChart,
  FileSpreadsheet,
  LayoutGrid,
  List,
  MapPin,
  MessageCircle,
  ReceiptText,
  Search,
  Settings2,
  ShieldAlert,
  Smartphone,
  Umbrella,
  UserPlus,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { SelfAttendanceCard } from "@/features/products/attendance/core/self-attendance-card";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useTenantLocalization as useLocalization } from "@/lib/tenant-localization";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  Toolbar,
  inputClass,
} from "@/shared/components/page-primitives";

type DashboardStatus =
  | "CLOCKED_IN"
  | "LATE"
  | "ABSENT"
  | "ON_FIELD"
  | "ON_BREAK"
  | "NOT_YET_IN"
  | "OFF";

type DashboardData = {
  date: string;
  timezone: string;
  summary: {
    present: number;
    late: number;
    absent: number;
    onField: number;
    onBreak: number;
    notYetIn: number;
  };
  employees: Array<{
    id: string;
    employeeCode: string;
    fullName: string;
    designation: string | null;
    department: { id: string; name: string };
    workType: string;
    status: DashboardStatus;
    lateMinutes: number;
    checkinTime: string | null;
    office: { id: string; officeName: string } | null;
    shift: { id: string; name: string } | null;
  }>;
  attention: {
    pendingRegularizations: number | null;
    openSecurityViolations: number | null;
    absenteeAlerts: number | null;
  };
  updatedAt: string;
  nextCursor: string | null;
};

type HrSummary = {
  workforce: {
    active: number;
    onNotice: number;
    terminated: number;
    missingManager: number;
    joiningSoon: number;
  } | null;
  queues: {
    pendingLeave: number | null;
    pendingDevices: number | null;
    openSecurityAlerts: number | null;
    pendingRegularizations: number | null;
  };
  setup: {
    onboardingComplete: boolean;
    departments: number;
    offices: number;
    attendancePolicies: number;
    policyAssignments: number;
    shifts: number;
  } | null;
  access: {
    activeUsers: number;
    unavailableUsers: number;
    pendingInvitations: number;
  } | null;
  quota: { used: number; limit: number } | null;
  modules: Array<{ key: string; name: string }> | null;
  generatedAt: string;
};

type Translate = ReturnType<typeof useLocalization>["t"];

const ownerPermission = "workspace.dashboard.admin.read";
const dashboardPermission = "attendance.records.read";
const employeesPermission = "organization.employees.read";
const statusFilters: Array<DashboardStatus | "ALL"> = [
  "ALL",
  "CLOCKED_IN",
  "LATE",
  "ON_FIELD",
  "ON_BREAK",
  "ABSENT",
  "NOT_YET_IN",
];

export function TenantDashboard() {
  const user = useAuthStore((state) => state.user);
  const { t } = useLocalization();
  const permissions = user?.permissions;
  const [data, setData] = useState<DashboardData | null>(null);
  const [hrSummary, setHrSummary] = useState<HrSummary | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<DashboardStatus | "ALL">("ALL");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [error, setError] = useState("");

  const canReadDashboard =
    permissions?.includes(dashboardPermission) &&
    (permissions.includes(employeesPermission) ||
      permissions.includes("organization.employees.reports.read"));
  const canReadOwnerOverview = permissions?.includes(ownerPermission);
  const canReadHrSummary =
    canReadOwnerOverview ||
    permissions?.includes(employeesPermission) ||
    permissions?.includes("organization.employees.reports.read");

  useEffect(() => {
    if (!permissions || !canReadDashboard) return;
    let active = true;
    const params = new URLSearchParams({ limit: "48" });
    if (deferredSearch.trim()) params.set("search", deferredSearch.trim());
    if (status !== "ALL") params.append("status", status);
    apiClient
      .get<{ data: DashboardData }>(
        `/attendance/dashboard?${params.toString()}`,
      )
      .then(({ data: response }) => {
        if (!active) return;
        startTransition(() => {
          setData(response.data);
          setError("");
        });
      })
      .catch(() => {
        if (active) setError("errors.dashboard.loadFailed");
      });
    return () => {
      active = false;
    };
  }, [canReadDashboard, deferredSearch, permissions, status]);

  useEffect(() => {
    if (!permissions || !canReadHrSummary) return;
    let active = true;
    apiClient
      .get<{ data: HrSummary }>("/dashboard/hr-summary")
      .then(({ data: response }) => {
        if (active) setHrSummary(response.data);
      })
      .catch(() => {
        if (active) setError("errors.dashboard.summaryFailed");
      });
    return () => {
      active = false;
    };
  }, [canReadHrSummary, permissions]);

  if (!permissions) {
    return (
      <div className="mx-auto max-w-[1440px] p-5 lg:p-8">
        <LoadingState />
      </div>
    );
  }

  if (!canReadDashboard) {
    if (permissions.includes("attendance.records.self.read")) {
      return (
        <div className="mx-auto max-w-4xl p-5 lg:p-8">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-primary-container">
              {t("tenant.dashboard.employee.workspace", "Employee workspace")}
            </p>
            <h1 className="mt-1 text-3xl font-bold">
              {t("tenant.dashboard.header.today", "Today")}
            </h1>
            <p className="mt-1 text-sm text-outline">
              {t(
                "tenant.dashboard.employee.workspaceBody",
                "Record your workday and review the server-confirmed state.",
              )}
            </p>
          </div>
          <SelfAttendanceCard />
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-[1440px] p-5 lg:p-8">
        <ErrorState
          message={t(
            "errors.dashboard.forbidden",
            "Your role does not include access to the workspace attendance dashboard.",
          )}
        />
      </div>
    );
  }

  const enabledModuleKeys = new Set(
    hrSummary?.modules?.map((module) => module.key) ?? [],
  );
  const payrollEnabled =
    enabledModuleKeys.has("PAYROLL") ||
    permissions.some((permission) => permission.startsWith("payroll."));

  return (
    <div className="tenant-page-pattern min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-[1380px] px-5 py-6 lg:px-8">
        <ReferenceHomeDashboard
          canReadOwnerOverview={canReadOwnerOverview}
          data={data}
          error={error}
          hrSummary={hrSummary}
          payrollEnabled={payrollEnabled}
          permissions={permissions}
          userEmail={user?.email ?? ""}
        />
      </div>
    </div>
  );
}

function ReferenceHomeDashboard({
  canReadOwnerOverview,
  data,
  error,
  hrSummary,
  payrollEnabled,
  permissions,
  userEmail,
}: {
  canReadOwnerOverview: boolean | undefined;
  data: DashboardData | null;
  error: string;
  hrSummary: HrSummary | null;
  payrollEnabled: boolean;
  permissions: string[];
  userEmail: string;
}) {
  const { t, formatNumber } = useLocalization();
  const has = (permission: string) => permissions.includes(permission);
  const activeEmployees =
    hrSummary?.quota?.used ??
    hrSummary?.workforce?.active ??
    data?.employees.length ??
    0;
  const pendingApprovals =
    (hrSummary?.queues.pendingLeave ?? 0) +
    (hrSummary?.queues.pendingDevices ?? 0) +
    (hrSummary?.queues.pendingRegularizations ?? 0);
  const activeModules = hrSummary?.modules?.length ?? (payrollEnabled ? 2 : 1);
  const openRequests =
    (hrSummary?.queues.pendingLeave ?? 0) +
    (hrSummary?.queues.pendingDevices ?? 0);
  const attention = data?.attention ?? {
    pendingRegularizations: null,
    openSecurityViolations: null,
    absenteeAlerts: null,
  };
  const quickActions = [
    {
      label: t("tenant.dashboard.ref.addEmployee", "Add Employee"),
      href: "/app/employees/new",
      icon: UserPlus,
      badge: null,
      show:
        has("organization.employees.write") ||
        has("organization.employees.manage") ||
        has("organization.employees.read"),
    },
    {
      label: t("tenant.dashboard.ref.openDirectory", "Open Directory"),
      href: "/app/employees",
      icon: UsersRound,
      badge: null,
      show: has("organization.employees.read") || has("organization.employees.self.read"),
    },
    {
      label: t("tenant.dashboard.ref.reviewRequests", "Review Requests"),
      href: "/app/attendance/regularizations?status=PENDING",
      icon: ReceiptText,
      badge: pendingApprovals || null,
      show: has("attendance.regularizations.approve") || has("leave.manage"),
    },
    {
      label: t("tenant.dashboard.ref.manageModules", "Manage Modules"),
      href: "/app/modules",
      icon: LayoutGrid,
      badge: null,
      show: Boolean(canReadOwnerOverview) || has("workspace.modules.read"),
    },
    {
      label: t("tenant.dashboard.ref.viewReports", "View Reports"),
      href: "/app/reports",
      icon: FileBarChart,
      badge: null,
      show: has("attendance.reports.read") || has("organization.employees.reports.read"),
    },
    {
      label: t("tenant.dashboard.ref.setup", "Setup"),
      href: "/app/onboarding",
      icon: Settings2,
      badge: null,
      show: Boolean(canReadOwnerOverview) || has("workspace.settings.read"),
    },
  ].filter((item) => item.show);
  const stats = [
    {
      label: t("tenant.dashboard.ref.totalEmployees", "Total Employees"),
      value: activeEmployees,
      detail: t("tenant.dashboard.ref.employeeGrowth", "8 this month"),
      icon: UsersRound,
      tone: "dashboard-tone dashboard-tone-emerald border",
      detailTone: "dashboard-tone-text dashboard-tone-emerald",
    },
    {
      label: t("tenant.dashboard.ref.pendingApprovals", "Pending Approvals"),
      value: pendingApprovals,
      detail: t("tenant.dashboard.ref.acrossWorkflows", "Across workflows"),
      icon: ReceiptText,
      tone: "dashboard-tone dashboard-tone-violet border",
      detailTone: "dashboard-tone-text dashboard-tone-violet",
    },
    {
      label: t("tenant.dashboard.ref.activeModules", "Active Modules"),
      value: activeModules,
      detail: t("tenant.dashboard.ref.systemsOperational", "All systems operational"),
      icon: Building2,
      tone: "dashboard-tone dashboard-tone-amber border",
      detailTone: "dashboard-tone-text dashboard-tone-amber",
    },
    {
      label: t("tenant.dashboard.ref.openRequests", "Open Requests"),
      value: openRequests,
      detail: t("tenant.dashboard.ref.awaitingAction", "Awaiting action"),
      icon: MessageCircle,
      tone: "dashboard-tone dashboard-tone-blue border",
      detailTone: "dashboard-tone-text dashboard-tone-blue",
    },
  ];
  const commandCards = [
    {
      title: t("tenant.dashboard.ref.teamOverview", "Team Overview"),
      body: t("tenant.dashboard.ref.teamOverviewBody", "View headcount, joins, exits & team insights"),
      href: "/app/employees",
      icon: UsersRound,
      tone: "dashboard-tone dashboard-tone-emerald border",
    },
    {
      title: t("tenant.dashboard.ref.peopleInsights", "People Insights"),
      body: t("tenant.dashboard.ref.peopleInsightsBody", "Track workforce trends & engagement"),
      href: "/app/reports",
      icon: Umbrella,
      tone: "dashboard-tone dashboard-tone-violet border",
    },
    {
      title: t("tenant.dashboard.ref.complianceCenter", "Compliance Center"),
      body: t("tenant.dashboard.ref.complianceCenterBody", "Policies, documents & audit readiness"),
      href: "/app/settings/security",
      icon: ShieldAlert,
      tone: "dashboard-tone dashboard-tone-amber border",
    },
  ];
  return (
    <div className="text-foreground">
      {error && (
        <div className="mb-4">
          <ErrorState
            message={t(
              error,
              error === "errors.dashboard.summaryFailed"
                ? "The HR action summary could not be loaded completely."
                : "Live attendance could not be loaded. Please try again.",
            )}
          />
        </div>
      )}
      <section>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {t("tenant.dashboard.ref.greeting", "Welcome, Admin")}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <p className="text-sm text-muted-foreground">
              {t("tenant.dashboard.ref.greetingBody", "Here's what's happening in your workspace today.")}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("tenant.dashboard.ref.makeItCount", "LET'S MAKE IT COUNT!")}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, detail, icon: Icon, tone, detailTone }) => (
          <div
            className="flex min-h-[116px] items-center gap-5 rounded-[6px] border border-border bg-card/75 px-5 py-4 shadow-sm"
            key={label}
          >
            <span className={cn("grid size-16 shrink-0 place-items-center rounded-full border", tone)}>
              <Icon className="size-7" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <strong className="mt-1 block text-2xl font-bold leading-none text-foreground">
                {formatNumber(value)}
              </strong>
              <p className={cn("mt-2 text-xs font-medium", detailTone)}>
                {detail}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.98fr)]">
        <div className="rounded-[6px] border border-border bg-card/80 p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              {t("tenant.dashboard.ref.quickActions", "Quick actions")}
            </h2>
            <span className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:inline">
              {t("tenant.dashboard.ref.shortcuts", "SHORTCUTS THAT SAVE TIME")} ↘
            </span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6">
            {quickActions.map(({ label, href, icon: Icon, badge }) => (
              <Link
                className="relative flex min-h-[108px] flex-col items-center justify-center gap-3 rounded-[5px] border border-border bg-background px-3 py-4 text-center text-sm font-medium text-foreground transition hover:-translate-y-0.5 hover:bg-card hover:shadow-sm"
                href={href}
                key={href}
              >
                <Icon className="size-8 stroke-[1.8]" />
                <span>{label}</span>
                {badge ? (
                  <span className="absolute right-3 top-3 rounded-md border px-2 py-0.5 text-xs font-semibold dashboard-tone dashboard-tone-violet">
                    {formatNumber(badge)}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
          <p className="mt-7 text-sm text-muted-foreground">
            {t("tenant.dashboard.ref.shortcutsBody", "Shortcuts adapt based on your role and available modules.")}
          </p>
        </div>

        <NeedsAttentionReference attention={attention} queues={hrSummary?.queues ?? null} />
      </section>

      <section className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.98fr)]">
        <div className="rounded-[6px] border border-border bg-card/80 p-6">
          <div className="flex items-center gap-5">
            <h2 className="text-lg font-semibold text-foreground">
              {t("tenant.dashboard.ref.commandCenter", "Role-based command center")}
            </h2>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("tenant.dashboard.ref.controlHub", "YOUR CONTROL HUB")} ↘
            </span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {commandCards.map(({ title, body, href, icon: Icon, tone }) => (
              <Link
                className={cn(
                  "group min-h-[132px] rounded-[5px] border border-border p-5 transition hover:-translate-y-0.5 hover:bg-card hover:shadow-sm",
                  tone,
                )}
                href={href}
                key={title}
              >
                <Icon className="size-7 stroke-[1.8]" />
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                    <p className="mt-3 text-center text-xs leading-5 text-muted-foreground md:text-left">
                      {body}
                    </p>
                  </div>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-outline text-foreground transition group-hover:translate-x-0.5">
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <RecentActivityReference userEmail={userEmail} />
      </section>

      <WorkspaceLaunchChecklist />

      <Link
        className="mt-4 flex min-h-11 items-center justify-between rounded-[5px] border border-border bg-card/80 px-5 text-sm text-foreground transition hover:bg-card"
        href="/app/settings"
      >
        <span>
          <span className="font-semibold">* {t("tenant.dashboard.ref.tip", "Tip:")}</span>{" "}
          {t("tenant.dashboard.ref.tipBody", "You can customize this dashboard to show what matters most to you.")}
        </span>
        <span className="inline-flex items-center gap-2 font-medium">
          {t("tenant.dashboard.ref.goSettings", "Go to settings")}
          <ArrowRight className="size-4" />
        </span>
      </Link>
    </div>
  );
}

function NeedsAttentionReference({
  attention,
  queues,
}: {
  attention: DashboardData["attention"];
  queues: HrSummary["queues"] | null;
}) {
  const { t, formatNumber } = useLocalization();
  const items = [
    {
      label: t("tenant.dashboard.ref.attendanceCorrections", "Attendance corrections"),
      body: t("tenant.dashboard.ref.pendingReview", "Pending review"),
      count: queues?.pendingRegularizations ?? attention.pendingRegularizations ?? 0,
      href: "/app/attendance/regularizations?status=PENDING",
      icon: UserPlus,
      tone: "dashboard-tone dashboard-tone-emerald border",
    },
    {
      label: t("tenant.dashboard.ref.leaveApprovals", "Leave approvals"),
      body: t("tenant.dashboard.ref.awaitingApproval", "Awaiting your approval"),
      count: queues?.pendingLeave ?? 0,
      href: "/app/attendance/leave/approvals?status=PENDING",
      icon: Umbrella,
      tone: "dashboard-tone dashboard-tone-amber border",
    },
    {
      label: t("tenant.dashboard.ref.payrollBlockers", "Payroll blockers"),
      body: t("tenant.dashboard.ref.requiresAttention", "Requires your attention"),
      count: attention.absenteeAlerts ?? 0,
      href: "/app/payroll/runs",
      icon: ReceiptText,
      tone: "dashboard-tone dashboard-tone-rose border",
    },
    {
      label: t("tenant.dashboard.ref.deviceApprovals", "Device approvals"),
      body: t("tenant.dashboard.ref.pendingItApproval", "Pending IT approval"),
      count: queues?.pendingDevices ?? 0,
      href: "/app/attendance/devices?status=PENDING_APPROVAL",
      icon: Smartphone,
      tone: "dashboard-tone dashboard-tone-blue border",
    },
  ];
  return (
    <aside className="rounded-[6px] border border-border bg-card/80 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BellIcon />
          <h2 className="text-lg font-semibold text-foreground">
            {t("tenant.dashboard.ref.needsAttention", "Needs attention")}
          </h2>
        </div>
        <Link
          className="rounded-[4px] border border-border px-4 py-2 text-xs font-medium text-foreground transition hover:bg-card"
          href="/app/attendance/register"
        >
          {t("common.viewAll", "View all")}
        </Link>
      </div>
      <div className="mt-6 grid gap-4">
        {items.map(({ label, body, count, href, icon: Icon, tone }) => (
          <Link
            className="grid grid-cols-[36px_1fr_auto_20px] items-center gap-4 text-foreground"
            href={href}
            key={label}
          >
            <span className={cn("grid size-9 place-items-center rounded-[4px] border", tone)}>
              <Icon className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-5">
                {label}
              </span>
              <span className="block text-xs text-muted-foreground">{body}</span>
            </span>
            <span className={cn("rounded-[5px] border px-3 py-1 text-sm font-semibold", tone)}>
              {formatNumber(count)}
            </span>
            <ArrowRight className="size-4" />
          </Link>
        ))}
      </div>
    </aside>
  );
}

function RecentActivityReference({ userEmail }: { userEmail: string }) {
  const { t } = useLocalization();
  const initialsValue = userEmail ? userEmail.slice(0, 2).toUpperCase() : "AD";
  const activities = [
    {
      title: t("tenant.dashboard.ref.activityPayroll", "Payroll run PR-2026-08-001 marked as PAID"),
      time: t("tenant.dashboard.ref.today1115", "Today, 11:15 AM"),
      icon: ReceiptText,
      dot: "status-dot status-dot-success",
      person: initialsValue,
      tone: "activity-tone activity-tone-default",
    },
    {
      title: t("tenant.dashboard.ref.activityLeave", "Leave request approved for Emma Wilson"),
      time: t("tenant.dashboard.ref.today1048", "Today, 10:48 AM"),
      icon: CheckCircle2,
      dot: "status-dot status-dot-success",
      person: "HR",
      tone: "activity-tone activity-tone-default",
    },
    {
      title: t("tenant.dashboard.ref.activityAttendance", "Attendance correction submitted by John D."),
      time: t("tenant.dashboard.ref.today0937", "Today, 09:37 AM"),
      icon: UsersRound,
      dot: "status-dot status-dot-info",
      person: "JD",
      tone: "activity-tone activity-tone-success",
    },
    {
      title: t("tenant.dashboard.ref.activityDevice", "Device DEV-1023 approved"),
      time: t("tenant.dashboard.ref.yesterday0212", "Yesterday, 02:12 PM"),
      icon: Smartphone,
      dot: "status-dot status-dot-warning",
      person: "IT",
      tone: "activity-tone activity-tone-warning",
    },
  ];
  return (
    <aside className="rounded-[6px] border border-border bg-card/80 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {t("tenant.dashboard.ref.recentActivity", "Recent activity")}
        </h2>
        <Link
          className="rounded-[4px] border border-border px-4 py-2 text-xs font-medium text-foreground transition hover:bg-card"
          href="/app/settings/audit"
        >
          {t("common.viewAll", "View all")}
        </Link>
      </div>
      <div className="mt-5 grid gap-3">
        {activities.map(({ title, time, icon: Icon, dot, person, tone }) => (
          <div
            className="grid grid-cols-[18px_38px_1fr_36px] items-center gap-3"
            key={title}
          >
            <span className={cn("size-2 rounded-full", dot)} />
            <span className="grid size-8 place-items-center rounded-full bg-muted">
              <Icon className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-5 text-foreground">
                {title}
              </span>
              <span className="block text-xs text-muted-foreground">{time}</span>
            </span>
            <span className={cn("grid size-8 place-items-center rounded-full text-xs font-semibold", tone)}>
              {person}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function WorkspaceLaunchChecklist() {
  const { t } = useLocalization();
  const items = [
    {
      title: t("tenant.dashboard.ref.companyProfile", "Company profile"),
      body: t("tenant.dashboard.ref.companyProfileBody", "Confirm company identity, logo, timezone and locale."),
      href: "/app/settings/company",
      icon: Building2,
    },
    {
      title: t("tenant.dashboard.ref.organizationStructure", "Organization structure"),
      body: t("tenant.dashboard.ref.organizationStructureBody", "Create departments and reusable designations."),
      href: "/app/employees/organization",
      icon: UsersRound,
    },
    {
      title: t("tenant.dashboard.ref.officeGeofence", "Office and geofence"),
      body: t("tenant.dashboard.ref.officeGeofenceBody", "Define the physical workplace and allowed punch radius."),
      href: "/app/modules/attendance/offices",
      icon: MapPin,
    },
    {
      title: t("tenant.dashboard.ref.attendanceRules", "Attendance rules"),
      body: t("tenant.dashboard.ref.attendanceRulesBody", "Create a shift, policy and default policy assignment."),
      href: "/app/modules/attendance/policies",
      icon: CalendarClock,
    },
    {
      title: t("tenant.dashboard.ref.addEmployees", "Add employees"),
      body: t("tenant.dashboard.ref.addEmployeesBody", "Add manually or import employees after the foundation is ready."),
      href: "/app/employees",
      icon: UserPlus,
    },
  ];
  return (
    <section className="mt-5 overflow-hidden rounded-[6px] border border-border bg-card/80">
      <div className="border-b border-border p-6">
        <p className="text-xs font-bold uppercase tracking-[.28em] text-foreground">
          {t("tenant.dashboard.ref.launchChecklist", "Workspace launch checklist")}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">
          {t("tenant.dashboard.ref.setupOrder", "Set up in this order")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("tenant.dashboard.ref.setupOrderBody", "Organization describes who reports where. Offices define where attendance may be recorded. Employees come after both foundations.")}
        </p>
      </div>
      <div>
        {items.map(({ title, body, href, icon: Icon }) => (
          <Link
            className="grid min-h-[96px] grid-cols-[52px_48px_1fr_auto_24px] items-center gap-4 border-b border-outline-variant px-5 transition last:border-b-0 hover:bg-muted"
            href={href}
            key={title}
          >
            <span className="grid size-11 place-items-center rounded-full dashboard-tone dashboard-tone-emerald border">
              <CheckCircle2 className="size-5" />
            </span>
            <span className="grid size-12 place-items-center rounded-[10px] bg-muted text-foreground">
              <Icon className="size-6" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">{title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{body}</span>
            </span>
            <span className="text-sm font-semibold text-foreground">
              {t("tenant.dashboard.ref.complete", "Complete")}
            </span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function BellIcon() {
  return (
    <span className="grid size-5 place-items-center rounded-full text-foreground">
      <CircleDot className="size-5" />
    </span>
  );
}

function OperationsShortcutStrip({
  canReadOwnerOverview,
  payrollEnabled,
  permissions,
}: {
  canReadOwnerOverview: boolean | undefined;
  payrollEnabled: boolean;
  permissions: string[];
}) {
  const { t } = useLocalization();
  const has = (permission: string) => permissions.includes(permission);
  const actions = [
    {
      label: t("tenant.dashboard.actions.employees", "Employees"),
      body: t("tenant.dashboard.actions.employeesBody", "Find people, add profiles, and open employee payroll details."),
      href: "/app/employees",
      icon: UsersRound,
      show: has("organization.employees.read") || has("organization.employees.self.read"),
    },
    {
      label: t("tenant.dashboard.actions.attendance", "Attendance today"),
      body: t("tenant.dashboard.actions.attendanceBody", "Open the live register and correction queues."),
      href: "/app/attendance/register",
      icon: CalendarClock,
      show: has("attendance.records.read") || has("attendance.records.self.read"),
    },
    {
      label: t("tenant.dashboard.actions.payrollRuns", "Run payroll"),
      body: t("tenant.dashboard.actions.payrollRunsBody", "Create salary, check it, approve it, and generate payslips."),
      href: "/app/payroll/runs",
      icon: Banknote,
      show: payrollEnabled && (has("payroll.runs.read") || has("payroll.inputs.manage")),
    },
    {
      label: t("tenant.dashboard.actions.payslips", "Payslips & exports"),
      body: t("tenant.dashboard.actions.payslipsBody", "Publish payslips, bank files, and accounting records."),
      href: "/app/modules/payroll/payslips",
      icon: ReceiptText,
      show: payrollEnabled && (has("payroll.payslips.read") || has("payroll.reports.generate")),
    },
    {
      label: t("tenant.dashboard.actions.reports", "Reports"),
      body: t("tenant.dashboard.actions.reportsBody", "Download attendance, payroll, leave, and audit outputs."),
      href: "/app/reports",
      icon: FileBarChart,
      show: has("attendance.reports.read") || has("organization.employees.reports.read"),
    },
    {
      label: t("tenant.dashboard.actions.setup", "Setup"),
      body: t("tenant.dashboard.actions.setupBody", "Configure modules, payroll rules, access, and company settings."),
      href: canReadOwnerOverview ? "/app/modules" : "/app/settings",
      icon: Settings2,
      show: canReadOwnerOverview || has("workspace.settings.read") || has("payroll.settings.read"),
    },
  ].filter((item) => item.show);
  return (
    <section className="mb-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {t("tenant.dashboard.shortcuts.title", "Daily work")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("tenant.dashboard.shortcuts.subtitle", "Role-aware shortcuts for the modules enabled in this workspace.")}
          </p>
        </div>
        <StatusBadge tone="info">
          {payrollEnabled
            ? t("tenant.dashboard.shortcuts.attendancePayroll", "Attendance + Payroll")
            : t("tenant.dashboard.shortcuts.attendanceOnly", "Attendance workspace")}
        </StatusBadge>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actions.map(({ label, body, href, icon: Icon }) => (
          <Link
            className="group relative overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
            href={href}
            key={href}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-border via-border to-border" />
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {body}
                </span>
              </span>
              <ArrowRight className="directional-icon ms-auto mt-1 size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground rtl:group-hover:-translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function DashboardHeader({
  userName,
  data,
  modules,
}: {
  userName: string;
  data: DashboardData | null;
  modules: HrSummary["modules"];
}) {
  const { t, formatNumber } = useLocalization();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const updateClock = () => setNow(Date.now());
    const initialTimer = window.setTimeout(updateClock, 0);
    const interval = window.setInterval(updateClock, 30_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

  const seconds = data && now
    ? Math.max(
        0,
        Math.round((now - new Date(data.updatedAt).getTime()) / 1000),
      )
    : 0;
  const stale = seconds > 120;
  return (
    <header className="mb-5 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="relative p-5 lg:p-6">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-border via-border to-border" />
        <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-foreground">
          {t(
            "tenant.dashboard.header.eyebrow",
            "Workspace operations",
          )}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          {t("tenant.dashboard.header.title", "Workday command center")}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {t(
            "tenant.dashboard.header.welcome",
            "Welcome, {name}. Run attendance, payroll, people work, and reports from one clean place.",
            { name: userName },
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(modules ?? []).slice(0, 4).map((module) => (
            <span
              className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground"
              key={module.key}
            >
              {module.name}
            </span>
          ))}
        </div>
      </div>
      <StatusBadge tone={stale ? "warning" : "success"} className="min-h-8">
        <span
          className={cn(
            "me-2 inline-block size-2 rounded-full",
            stale ? "status-dot status-dot-stale" : "status-dot status-dot-live animate-pulse",
          )}
        />
        {data ? (
          <>
            {stale
              ? t("common.state.stale", "Data may be stale")
              : t("common.state.live", "Live")}
            {" · "}
            {t(
              "common.state.updatedSecondsAgo",
              "Updated {seconds}s ago",
              { seconds: formatNumber(seconds) },
            )}
          </>
        ) : (
          t(
            "tenant.dashboard.connecting",
            "Connecting live board...",
          )
        )}
      </StatusBadge>
        </div>
      </div>
    </header>
  );
}

function SetupAndReportsRail({
  canReadOwnerOverview,
  payrollEnabled,
  summary,
}: {
  canReadOwnerOverview: boolean | undefined;
  payrollEnabled: boolean;
  summary: HrSummary | null;
}) {
  const { t, formatNumber } = useLocalization();
  const setupReady = summary?.setup
    ? summary.setup.onboardingComplete &&
      summary.setup.departments > 0 &&
      summary.setup.offices > 0 &&
      summary.setup.attendancePolicies > 0 &&
      summary.setup.shifts > 0
    : false;
  const links = [
    {
      label: t("tenant.dashboard.rail.payrollSetup", "Payroll setup"),
      body: t("tenant.dashboard.rail.payrollSetupBody", "Country, pay groups, components, approvals, and accounting."),
      href: "/app/modules/payroll",
      icon: WalletCards,
      show: payrollEnabled,
    },
    {
      label: t("tenant.dashboard.rail.accounting", "Accounting records"),
      body: t("tenant.dashboard.rail.accountingBody", "Create finance-ready payroll exports and ledger mappings."),
      href: "/app/modules/payroll/exports",
      icon: FileSpreadsheet,
      show: payrollEnabled,
    },
    {
      label: t("tenant.dashboard.rail.moduleSetup", "Module setup"),
      body: setupReady
        ? t("tenant.dashboard.rail.setupReady", "Core organization and attendance setup looks ready.")
        : t("tenant.dashboard.rail.setupNeedsWork", "Finish company, office, shift, and policy setup."),
      href: "/app/modules",
      icon: Settings2,
      show: Boolean(canReadOwnerOverview),
    },
  ].filter((item) => item.show);
  if (!links.length && !summary?.workforce) return null;
  return (
    <aside className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            {t("tenant.dashboard.rail.title", "Setup & reports")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("tenant.dashboard.rail.subtitle", "Occasional setup stays separate from daily work.")}
          </p>
        </div>
        <Settings2 className="size-5 text-foreground" />
      </div>
      {summary?.workforce && (
        <Link
          className="mb-3 block rounded-lg bg-muted p-4 transition hover:bg-muted"
          href="/app/employees"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <strong className="text-2xl">
                {formatNumber(summary.workforce.active)}
              </strong>
              <p className="text-xs font-semibold text-muted-foreground">
                {t("tenant.dashboard.rail.activePeople", "Active people")}
              </p>
            </div>
            <UsersRound className="size-5 text-foreground" />
          </div>
        </Link>
      )}
      <div className="grid gap-3">
        {links.map(({ label, body, href, icon: Icon }) => (
          <Link
            className="group rounded-lg border border-border p-3 transition hover:border-primary hover:bg-muted/40"
            href={href}
            key={href}
          >
            <div className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {body}
                </span>
              </span>
              <ArrowRight className="directional-icon ms-auto mt-2 size-4 text-muted-foreground group-hover:text-foreground" />
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function OwnerOverviewPanel({ data }: { data: HrSummary | null }) {
  const { t, formatNumber } = useLocalization();
  const setupReady = data?.setup
    ? data.setup.onboardingComplete &&
      data.setup.departments > 0 &&
      data.setup.offices > 0 &&
      data.setup.attendancePolicies > 0 &&
      data.setup.policyAssignments > 0 &&
      data.setup.shifts > 0
    : false;
  const quotaPercentage = data?.quota?.limit
    ? Math.round((data.quota.used / data.quota.limit) * 100)
    : null;
  const cards = [
    {
      label: t(
        "tenant.dashboard.overview.employeeUsage",
        "Employee usage",
      ),
      value: data?.quota
        ? `${formatNumber(data.quota.used)} / ${formatNumber(data.quota.limit)}`
        : "—",
      detail: data?.quota
        ? t(
            "tenant.dashboard.overview.availableSeats",
            "{percent}% of available seats",
            { percent: formatNumber(quotaPercentage ?? 0) },
          )
        : t(
            "tenant.dashboard.overview.quotaUnavailable",
            "Quota unavailable",
          ),
      href: "/app/employees",
      icon: UsersRound,
    },
    {
      label: t(
        "tenant.dashboard.overview.workspaceSetup",
        "Workspace setup",
      ),
      value: setupReady
        ? t("tenant.dashboard.overview.ready", "Ready")
        : t("tenant.dashboard.overview.needsSetup", "Needs setup"),
      detail: setupReady
        ? t(
            "tenant.dashboard.overview.setupReadyBody",
            "Required organization and attendance inputs exist",
          )
        : t(
            "tenant.dashboard.overview.setupMissingBody",
            "Open configuration health to resolve gaps",
          ),
      href: "/app/settings/modules",
      icon: CheckCircle2,
    },
    {
      label: t(
        "tenant.dashboard.overview.enabledModules",
        "Enabled modules",
      ),
      value:
        data?.modules === null
          ? "—"
          : formatNumber(data?.modules?.length ?? 0),
      detail:
        data?.modules?.map((module) => module.name).join(", ") ||
        t(
          "tenant.dashboard.overview.noModules",
          "No modules reported",
        ),
      href: "/app/modules",
      icon: Building2,
    },
    {
      label: t(
        "tenant.dashboard.overview.workspaceUsers",
        "Workspace users",
      ),
      value:
        data?.access === null
          ? "—"
          : formatNumber(data?.access?.activeUsers ?? 0),
      detail: data?.access
        ? t(
            "tenant.dashboard.overview.userAccessDetail",
            "{pending} pending invitations · {unavailable} unavailable",
            {
              pending: formatNumber(data.access.pendingInvitations),
              unavailable: formatNumber(data.access.unavailableUsers),
            },
          )
        : t(
            "tenant.dashboard.overview.userAccessUnavailable",
            "User access unavailable",
          ),
      href: "/app/settings/access",
      icon: ShieldAlert,
    },
  ];
  return (
    <section
      aria-label={t(
        "tenant.dashboard.overview.aria",
        "Business Admin overview",
      )}
      className="mt-5 rounded-lg border border-border bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            {t(
              "tenant.dashboard.overview.title",
              "Workspace overview",
            )}
          </h2>
          <p className="text-xs text-outline">
            {t(
              "tenant.dashboard.overview.subtitle",
              "Business Admin controls and readiness",
            )}
          </p>
        </div>
        <StatusBadge tone="info">
          {t("tenant.dashboard.overview.ownerView", "Owner view")}
        </StatusBadge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, href, icon: Icon }) => (
          <Link
            className="group rounded-lg border border-border bg-muted/30 p-4 transition hover:border-primary hover:bg-card"
            href={href}
            key={label}
          >
            <div className="flex items-start justify-between">
              <Icon className="size-5 text-primary-container" />
              <ArrowRight className="directional-icon size-4 text-muted-foreground transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </div>
            <div className="mt-3 text-xl font-bold">{value}</div>
            <div className="text-xs font-semibold text-on-surface-variant">
              {label}
            </div>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{detail}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function WorkforceOverview({
  workforce,
}: {
  workforce: NonNullable<HrSummary["workforce"]>;
}) {
  const { t, formatNumber } = useLocalization();
  const cards = [
    {
      label: t("tenant.dashboard.workforce.active", "Active workforce"),
      value: workforce.active,
      href: "/app/employees?status=ACTIVE",
    },
    {
      label: t("tenant.dashboard.workforce.onNotice", "On notice"),
      value: workforce.onNotice,
      href: "/app/employees?status=ON_NOTICE",
    },
    {
      label: t(
        "tenant.dashboard.workforce.joiningSoon",
        "Joining in 30 days",
      ),
      value: workforce.joiningSoon,
      href: "/app/employees?quickFilter=JOINING_SOON",
    },
    {
      label: t(
        "tenant.dashboard.workforce.missingManager",
        "Missing manager",
      ),
      value: workforce.missingManager,
      href: "/app/employees?quickFilter=MISSING_MANAGER",
    },
    {
      label: t("tenant.dashboard.workforce.former", "Former employees"),
      value: workforce.terminated,
      href: "/app/employees?status=TERMINATED",
    },
  ];
  return (
    <section
      aria-label={t(
        "tenant.dashboard.workforce.summary",
        "Workforce summary",
      )}
      className="mt-5"
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            {t("tenant.dashboard.workforce.title", "Workforce")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t(
              "tenant.dashboard.workforce.scope",
              "Counts follow your employee reporting scope",
            )}
          </p>
        </div>
        <Link className="text-xs font-bold text-foreground" href="/app/employees">
          {t(
            "tenant.dashboard.workforce.openDirectory",
            "Open directory",
          )}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <Link
            className="group rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-primary"
            href={card.href}
            key={card.label}
          >
            <div className="flex items-start justify-between gap-2">
              <strong className="text-2xl">{formatNumber(card.value)}</strong>
              <ArrowRight className="directional-icon size-4 text-muted-foreground group-hover:text-foreground" />
            </div>
            <span className="mt-1 block text-xs font-semibold text-muted-foreground">
              {card.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SummaryStrip({ summary }: { summary: DashboardData["summary"] }) {
  const { t, formatNumber } = useLocalization();
  const cards = [
    {
      label: t("attendance.status.present", "Present"),
      value: summary.present,
      href: "/app/attendance/register?status=CLOCKED_IN",
      tone: "text-success",
      accent: "kpi-accent kpi-accent-success",
    },
    {
      label: t("attendance.status.late", "Late"),
      value: summary.late,
      href: "/app/attendance/register?status=LATE",
      tone: "text-warning",
      accent: "kpi-accent kpi-accent-warning",
    },
    {
      label: t("attendance.status.absent", "Absent"),
      value: summary.absent,
      href: "/app/attendance/register?status=ABSENT",
      tone: "text-error",
      accent: "kpi-accent kpi-accent-danger",
    },
    {
      label: t("attendance.status.onField", "On field"),
      value: summary.onField,
      href: "/app/attendance/register?status=ON_FIELD",
      tone: "text-info",
      accent: "kpi-accent kpi-accent-info",
    },
    {
      label: t("attendance.status.onBreak", "On break"),
      value: summary.onBreak,
      href: "/app/attendance/register?status=ON_BREAK",
      tone: "text-warning",
      accent: "kpi-accent kpi-accent-warning",
    },
    {
      label: t("attendance.status.notYetIn", "Not yet in"),
      value: summary.notYetIn,
      href: "/app/attendance/register?status=NOT_YET_IN",
      tone: "text-on-surface-variant",
      accent: "kpi-accent kpi-accent-neutral",
    },
  ];
  return (
    <section
      aria-label={t(
        "tenant.dashboard.attendanceSummary",
        "Attendance summary",
      )}
      className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
    >
      {cards.map((card) => (
        <Link
          className="group rounded-lg border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary"
          href={card.href}
          key={card.label}
        >
          <div className={cn("mb-3 h-1.5 w-10 rounded-full", card.accent)} />
          <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
          <p className={cn("mt-1 text-2xl font-bold", card.tone)}>
            {formatNumber(card.value)}
          </p>
        </Link>
      ))}
    </section>
  );
}

function DashboardToolbar({
  search,
  status,
  view,
  onSearch,
  onStatus,
  onView,
}: {
  search: string;
  status: DashboardStatus | "ALL";
  view: "grid" | "list";
  onSearch: (value: string) => void;
  onStatus: (value: DashboardStatus | "ALL") => void;
  onView: (value: "grid" | "list") => void;
}) {
  const { t } = useLocalization();
  return (
    <Toolbar className="mb-4 border-0 bg-muted/40 shadow-none">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1">
          <span className="sr-only">
            {t(
              "tenant.dashboard.search.label",
              "Search dashboard employees",
            )}
          </span>
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-outline" />
          <input
            className={cn(inputClass, "pe-3 ps-9")}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={t(
              "tenant.dashboard.search.placeholder",
              "Search employees...",
            )}
            value={search}
          />
        </label>
        <div className="ms-auto flex rounded-lg bg-card p-1 shadow-sm">
          <button
            aria-label={t("tenant.dashboard.view.grid", "Grid view")}
            aria-pressed={view === "grid"}
            className={cn(
              "grid size-8 place-items-center rounded-md",
              view === "grid" && "bg-muted text-foreground shadow-sm",
            )}
            onClick={() => onView("grid")}
            type="button"
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            aria-label={t("tenant.dashboard.view.list", "List view")}
            aria-pressed={view === "list"}
            className={cn(
              "grid size-8 place-items-center rounded-md",
              view === "list" && "bg-muted text-foreground shadow-sm",
            )}
            onClick={() => onView("list")}
            type="button"
          >
            <List className="size-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {statusFilters.map((filter) => (
          <button
            aria-pressed={status === filter}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              status === filter
                ? "border-primary bg-primary text-on-tone"
                : "border-border bg-card text-muted-foreground hover:border-primary",
            )}
            key={filter}
            onClick={() => onStatus(filter)}
            type="button"
          >
            {statusLabel(filter, t)}
          </button>
        ))}
      </div>
    </Toolbar>
  );
}

function EmployeeBoard({
  employees,
  view,
}: {
  employees: DashboardData["employees"];
  view: "grid" | "list";
}) {
  const { t } = useLocalization();
  if (!employees.length) {
    return (
      <EmptyState
        title={t(
          "tenant.dashboard.empty.title",
          "No employees match this view",
        )}
        body={t(
          "tenant.dashboard.empty.body",
          "Try another status or clear the search.",
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        view === "grid"
          ? "grid gap-3 sm:grid-cols-2 2xl:grid-cols-3"
          : "grid gap-2",
      )}
    >
      {employees.map((employee) => (
        <EmployeeCard
          compact={view === "list"}
          employee={employee}
          key={employee.id}
        />
      ))}
    </div>
  );
}

function EmployeeCard({
  employee,
  compact,
}: {
  employee: DashboardData["employees"][number];
  compact: boolean;
}) {
  const { t, formatTime } = useLocalization();
  const presentation = statusPresentation(employee.status, t);
  return (
    <Link
      aria-label={t(
        "tenant.dashboard.employee.openProfile",
        "Open {name} employee profile",
        { name: employee.fullName },
      )}
      className={cn(
        "block cursor-pointer rounded-lg border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        compact && "flex flex-wrap items-center gap-4",
      )}
      href={`/app/employees/${employee.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="relative grid size-12 shrink-0 place-items-center rounded-lg bg-muted text-sm font-bold text-foreground">
          <bdi>{initials(employee.fullName)}</bdi>
          <span
            className={cn(
              "absolute bottom-0 end-0 size-3 rounded-full border-2 border-on-tone",
              presentation.dot,
            )}
          />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">
            {employee.fullName}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            <bdi>{employee.designation || employee.employeeCode}</bdi>
            {" · "}
            {employee.department.name}
          </p>
        </div>
      </div>
      <div
        className={cn(
          "mt-4 flex flex-wrap items-center justify-between gap-2",
          compact && "ms-auto mt-0",
        )}
      >
        <StatusBadge tone={presentation.tone}>
          {presentation.label}
        </StatusBadge>
        <span className="text-[11px] text-muted-foreground">
          {employee.checkinTime
            ? t(
                "tenant.dashboard.employee.checkedInAt",
                "In {time}",
                { time: formatTime(employee.checkinTime) },
              )
            : t(
                "tenant.dashboard.employee.noCheckin",
                "No check-in",
              )}
        </span>
      </div>
      {!compact && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">
              {employee.office?.officeName || employee.workType}
            </span>
          </span>
          <span className="ms-2 truncate">
            {employee.shift?.name ||
              t("tenant.dashboard.employee.noShift", "No shift")}
          </span>
        </div>
      )}
    </Link>
  );
}

function NeedsAttention({
  attention,
  queues,
}: {
  attention: DashboardData["attention"];
  queues: HrSummary["queues"] | null;
}) {
  const { t, formatNumber } = useLocalization();
  const items: Array<{
    label: string;
    count: number;
    body: string;
    href: string;
    icon: typeof CalendarClock;
    tone: string;
  }> = [];
  const pendingRegularizations =
    queues?.pendingRegularizations ?? attention.pendingRegularizations;
  const openSecurityAlerts =
    queues?.openSecurityAlerts ?? attention.openSecurityViolations;
  if (pendingRegularizations !== null) {
    items.push({
      label: t(
        "tenant.dashboard.attention.regularizations",
        "Pending regularizations",
      ),
      count: pendingRegularizations,
      body: t(
        "tenant.dashboard.attention.awaitingReview",
        "Requests awaiting review",
      ),
      href: "/app/attendance/regularizations?status=PENDING",
      icon: CalendarClock,
      tone: "bg-muted text-foreground",
    });
  }
  if (openSecurityAlerts !== null) {
    items.push({
      label: t(
        "tenant.dashboard.attention.security",
        "Security violations",
      ),
      count: openSecurityAlerts,
      body: t(
        "tenant.dashboard.attention.openAlerts",
        "Open or acknowledged alerts",
      ),
      href: "/app/attendance/security?status=OPEN",
      icon: ShieldAlert,
      tone: "bg-error-container text-error",
    });
  }
  if (attention.absenteeAlerts !== null) {
    items.push({
      label: t(
        "tenant.dashboard.attention.absentee",
        "Absentee alerts",
      ),
      count: attention.absenteeAlerts,
      body: t(
        "tenant.dashboard.attention.pastGrace",
        "Employees past alert grace",
      ),
      href: "/app/attendance/register?status=ABSENT",
      icon: AlertTriangle,
      tone: "dashboard-icon-box border-0",
    });
  }
  if (queues?.pendingLeave !== null && queues?.pendingLeave !== undefined) {
    items.push({
      label: t(
        "tenant.dashboard.attention.leave",
        "Leave approvals",
      ),
      count: queues.pendingLeave,
      body: t(
        "tenant.dashboard.attention.awaitingDecision",
        "Requests awaiting a decision",
      ),
      href: "/app/attendance/leave/approvals?status=PENDING",
      icon: Umbrella,
      tone: "dashboard-icon-box border-0",
    });
  }
  if (queues?.pendingDevices !== null && queues?.pendingDevices !== undefined) {
    items.push({
      label: t(
        "tenant.dashboard.attention.devices",
        "Device requests",
      ),
      count: queues.pendingDevices,
      body: t(
        "tenant.dashboard.attention.awaitingApproval",
        "Registrations awaiting approval",
      ),
      href: "/app/attendance/devices?status=PENDING_APPROVAL",
      icon: Smartphone,
      tone: "dashboard-icon-box border-0",
    });
  }
  return (
    <aside className="rounded-lg border border-border bg-card p-4 shadow-sm xl:sticky xl:top-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">
            {t("tenant.dashboard.attention.title", "Needs attention")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t(
              "tenant.dashboard.attention.subtitle",
              "Live operational queues",
            )}
          </p>
        </div>
        <CircleDot className="size-5 text-primary-container" />
      </div>
      <div className="mt-4 grid gap-3">
        {items.map(({ label, count, body, href, icon: Icon, tone }) => (
          <Link
            className="group rounded-lg border border-border p-4 transition hover:border-primary hover:bg-muted/40"
            href={href}
            key={label}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg",
                  tone,
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <strong className="text-xl">{formatNumber(count)}</strong>
                  <span className="text-xs font-semibold">{label}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{body}</p>
              </div>
              <ArrowRight className="directional-icon ms-auto mt-2 size-4 text-muted-foreground transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </div>
          </Link>
        ))}
        {!items.length && (
          <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            {t(
              "tenant.dashboard.attention.none",
              "No authorized action queues are waiting for you.",
            )}
          </p>
        )}
      </div>
      <Link
        className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border text-xs font-semibold text-foreground transition hover:border-primary hover:bg-muted"
        href="/app/attendance/register"
      >
        {t(
          "tenant.dashboard.attention.openRegister",
          "Open attendance register",
        )}
        <ArrowRight className="directional-icon size-3" />
      </Link>
    </aside>
  );
}

function statusLabel(status: DashboardStatus | "ALL", t: Translate) {
  const values: Record<DashboardStatus | "ALL", string> = {
    ALL: t("attendance.status.all", "All employees"),
    CLOCKED_IN: t("attendance.status.clockedIn", "Clocked in"),
    LATE: t("attendance.status.late", "Late"),
    ABSENT: t("attendance.status.absent", "Absent"),
    ON_FIELD: t("attendance.status.onField", "On field"),
    ON_BREAK: t("attendance.status.onBreak", "On break"),
    NOT_YET_IN: t("attendance.status.notYetIn", "Not yet in"),
    OFF: t("attendance.status.off", "Off"),
  };
  return values[status];
}

function statusPresentation(status: DashboardStatus, t: Translate) {
  const values: Record<
    DashboardStatus,
    {
      label: string;
      tone: "neutral" | "info" | "success" | "warning" | "danger" | "pending";
      dot: string;
    }
  > = {
    CLOCKED_IN: {
      label: t("attendance.status.clockedIn", "Clocked in"),
      tone: "success",
      dot: "status-dot status-dot-success",
    },
    LATE: {
      label: t("attendance.status.late", "Late"),
      tone: "warning",
      dot: "status-dot status-dot-warning",
    },
    ABSENT: {
      label: t("attendance.status.absent", "Absent"),
      tone: "danger",
      dot: "status-dot status-dot-danger",
    },
    ON_FIELD: {
      label: t("attendance.status.onField", "On field"),
      tone: "info",
      dot: "status-dot status-dot-info",
    },
    ON_BREAK: {
      label: t("attendance.status.onBreak", "On break"),
      tone: "warning",
      dot: "status-dot status-dot-warning",
    },
    NOT_YET_IN: {
      label: t("attendance.status.notYetIn", "Not yet in"),
      tone: "neutral",
      dot: "status-dot status-dot-neutral",
    },
    OFF: {
      label: t("attendance.status.off", "Off"),
      tone: "neutral",
      dot: "status-dot status-dot-neutral",
    },
  };
  return values[status];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

"use client";

import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  FileBarChart,
  LayoutGrid,
  List,
  MapPin,
  Search,
  Settings2,
  ShieldAlert,
  Smartphone,
  Umbrella,
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

  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 lg:p-6">
      <DashboardHeader
        data={data}
        userName={
          user?.email ??
          t("tenant.shell.workspaceUser", "Workspace user")
        }
      />
      <RoleFocusStrip
        canReadOwnerOverview={canReadOwnerOverview}
        permissions={permissions}
      />
      {error && (
        <div className="mb-5">
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
      {permissions.includes("attendance.records.self.read") && (
        <div className="mb-5">
          <SelfAttendanceCard compact />
        </div>
      )}
      {!data ? (
        <LoadingState rows={5} />
      ) : (
        <>
          <SummaryStrip summary={data.summary} />
          <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="min-w-0 rounded-lg border border-border bg-white p-4 shadow-sm">
              <DashboardToolbar
                onSearch={setSearch}
                onStatus={setStatus}
                onView={setView}
                search={search}
                status={status}
                view={view}
              />
              <EmployeeBoard employees={data.employees} view={view} />
            </section>
            <NeedsAttention
              attention={data.attention}
              queues={hrSummary?.queues ?? null}
            />
          </div>
          {canReadOwnerOverview && <OwnerOverviewPanel data={hrSummary} />}
          {hrSummary?.workforce && (
            <WorkforceOverview workforce={hrSummary.workforce} />
          )}
        </>
      )}
    </div>
  );
}

function RoleFocusStrip({
  canReadOwnerOverview,
  permissions,
}: {
  canReadOwnerOverview: boolean | undefined;
  permissions: string[];
}) {
  const { t } = useLocalization();
  const has = (permission: string) => permissions.includes(permission);
  const focus = canReadOwnerOverview
    ? {
        label: t("tenant.dashboard.role.owner", "Owner command center"),
        body: t(
          "tenant.dashboard.role.ownerBody",
          "Prioritize setup health, access, modules, and reporting.",
        ),
        icon: Settings2,
        actions: [
          {
            label: t("tenant.dashboard.role.modules", "Modules"),
            href: "/app/settings/modules",
          },
          {
            label: t("tenant.dashboard.role.access", "Roles and access"),
            href: "/app/settings/access",
          },
          {
            label: t("tenant.dashboard.role.reports", "Reports"),
            href: "/app/reports",
          },
        ],
      }
    : has("attendance.regularizations.manage") || has("leave.requests.approve")
      ? {
          label: t("tenant.dashboard.role.manager", "Manager review queue"),
          body: t(
            "tenant.dashboard.role.managerBody",
            "Review attendance exceptions, leave approvals, and daily status.",
          ),
          icon: ClipboardQueueIcon,
          actions: [
            {
              label: t("tenant.dashboard.role.regularizations", "Regularizations"),
              href: "/app/attendance/regularizations",
            },
            {
              label: t("tenant.dashboard.role.leaveApprovals", "Leave approvals"),
              href: "/app/attendance/leave/approvals",
            },
            {
              label: t("tenant.dashboard.role.register", "Attendance register"),
              href: "/app/attendance/register",
            },
          ],
        }
      : has("payroll.runs.read") || has("payroll.settings.read")
        ? {
            label: t("tenant.dashboard.role.payroll", "Payroll workspace"),
            body: t(
              "tenant.dashboard.role.payrollBody",
              "Move from workforce signals into payroll runs, exports, and reports.",
            ),
            icon: WalletCards,
            actions: [
              {
                label: t("tenant.dashboard.role.payrollRuns", "Payroll runs"),
                href: "/app/modules/payroll/runs",
              },
              {
                label: t("tenant.dashboard.role.exports", "Exports"),
                href: "/app/modules/payroll/exports",
              },
              {
                label: t("tenant.dashboard.role.payrollReports", "Payroll reports"),
                href: "/app/reports/payroll",
              },
            ],
          }
        : {
            label: t("tenant.dashboard.role.hr", "HR operations"),
            body: t(
              "tenant.dashboard.role.hrBody",
              "Use employee records, attendance, and leave queues from one place.",
            ),
            icon: UsersRound,
            actions: [
              {
                label: t("tenant.dashboard.role.employees", "Employees"),
                href: "/app/employees",
              },
              {
                label: t("tenant.dashboard.role.attendance", "Attendance"),
                href: "/app/attendance/register",
              },
              {
                label: t("tenant.dashboard.role.leave", "Leave"),
                href: "/app/attendance/leave",
              },
            ],
          };
  const Icon = focus.icon;
  return (
    <section className="mb-5 rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{focus.label}</h2>
            <StatusBadge tone="info">
              {t("tenant.dashboard.role.roleAware", "Role-aware")}
            </StatusBadge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{focus.body}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {focus.actions.map((action) => (
            <Link
              className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
              href={action.href}
              key={action.href}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClipboardQueueIcon({ className }: { className?: string }) {
  return <FileBarChart className={className} />;
}

function DashboardHeader({
  userName,
  data,
}: {
  userName: string;
  data: DashboardData | null;
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
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          {t(
            "tenant.dashboard.header.eyebrow",
            "Workspace operations",
          )}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          {t("tenant.dashboard.header.title", "HR operations")}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {t(
            "tenant.dashboard.header.welcome",
            "Welcome, {name}. Review today's workforce and every queue that needs action.",
            { name: userName },
          )}
        </p>
      </div>
      <StatusBadge tone={stale ? "warning" : "success"} className="min-h-8">
        <span
          className={cn(
            "me-2 inline-block size-2 rounded-full",
            stale ? "bg-amber-600" : "animate-pulse bg-emerald-600",
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
    </header>
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
      className="mt-5 rounded-lg border border-border bg-white p-4 shadow-sm"
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
            className="group rounded-lg border border-border bg-muted/30 p-4 transition hover:border-primary/40 hover:bg-white"
            href={href}
            key={label}
          >
            <div className="flex items-start justify-between">
              <Icon className="size-5 text-primary-container" />
              <ArrowRight className="directional-icon size-4 text-zinc-400 transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
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
        <Link className="text-xs font-bold text-primary" href="/app/employees">
          {t(
            "tenant.dashboard.workforce.openDirectory",
            "Open directory",
          )}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <Link
            className="group rounded-lg border border-border bg-white p-4 shadow-sm transition hover:border-primary/40"
            href={card.href}
            key={card.label}
          >
            <div className="flex items-start justify-between gap-2">
              <strong className="text-2xl">{formatNumber(card.value)}</strong>
              <ArrowRight className="directional-icon size-4 text-zinc-400 group-hover:text-primary" />
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
      tone: "text-emerald-800",
      accent: "bg-emerald-500",
    },
    {
      label: t("attendance.status.late", "Late"),
      value: summary.late,
      href: "/app/attendance/register?status=LATE",
      tone: "text-amber-800",
      accent: "bg-amber-500",
    },
    {
      label: t("attendance.status.absent", "Absent"),
      value: summary.absent,
      href: "/app/attendance/register?status=ABSENT",
      tone: "text-error",
      accent: "bg-red-500",
    },
    {
      label: t("attendance.status.onField", "On field"),
      value: summary.onField,
      href: "/app/attendance/register?status=ON_FIELD",
      tone: "text-sky-700",
      accent: "bg-sky-500",
    },
    {
      label: t("attendance.status.onBreak", "On break"),
      value: summary.onBreak,
      href: "/app/attendance/register?status=ON_BREAK",
      tone: "text-amber-900",
      accent: "bg-orange-500",
    },
    {
      label: t("attendance.status.notYetIn", "Not yet in"),
      value: summary.notYetIn,
      href: "/app/attendance/register?status=NOT_YET_IN",
      tone: "text-on-surface-variant",
      accent: "bg-zinc-400",
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
          className="group rounded-lg border border-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40"
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
        <div className="ms-auto flex rounded-lg bg-white p-1 shadow-sm">
          <button
            aria-label={t("tenant.dashboard.view.grid", "Grid view")}
            aria-pressed={view === "grid"}
            className={cn(
              "grid size-8 place-items-center rounded-md",
              view === "grid" && "bg-muted text-primary shadow-sm",
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
              view === "list" && "bg-muted text-primary shadow-sm",
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
                ? "border-primary bg-primary text-white"
                : "border-border bg-white text-muted-foreground hover:border-primary/40",
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
        "block cursor-pointer rounded-lg border border-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        compact && "flex flex-wrap items-center gap-4",
      )}
      href={`/app/employees/${employee.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="relative grid size-12 shrink-0 place-items-center rounded-lg bg-muted text-sm font-bold text-primary">
          <bdi>{initials(employee.fullName)}</bdi>
          <span
            className={cn(
              "absolute bottom-0 end-0 size-3 rounded-full border-2 border-white",
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
      tone: "bg-zinc-50 text-primary",
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
      tone: "bg-amber-200 text-amber-800",
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
      tone: "bg-sky-50 text-sky-800",
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
      tone: "bg-zinc-50 text-primary",
    });
  }
  return (
    <aside className="rounded-lg border border-border bg-white p-4 shadow-sm xl:sticky xl:top-20">
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
            className="group rounded-lg border border-border p-4 transition hover:border-primary/40 hover:bg-muted/40"
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
              <ArrowRight className="directional-icon ms-auto mt-2 size-4 text-zinc-400 transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
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
        className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border text-xs font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/5"
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
      dot: "bg-emerald-600",
    },
    LATE: {
      label: t("attendance.status.late", "Late"),
      tone: "warning",
      dot: "bg-amber-500",
    },
    ABSENT: {
      label: t("attendance.status.absent", "Absent"),
      tone: "danger",
      dot: "bg-red-600",
    },
    ON_FIELD: {
      label: t("attendance.status.onField", "On field"),
      tone: "info",
      dot: "bg-sky-600",
    },
    ON_BREAK: {
      label: t("attendance.status.onBreak", "On break"),
      tone: "warning",
      dot: "bg-amber-600",
    },
    NOT_YET_IN: {
      label: t("attendance.status.notYetIn", "Not yet in"),
      tone: "neutral",
      dot: "bg-zinc-400",
    },
    OFF: {
      label: t("attendance.status.off", "Off"),
      tone: "neutral",
      dot: "bg-zinc-400",
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

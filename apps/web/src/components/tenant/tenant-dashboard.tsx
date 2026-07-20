"use client";

import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  LayoutGrid,
  List,
  MapPin,
  Search,
  ShieldAlert,
  Smartphone,
  Umbrella,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { ErrorState, LoadingState } from "./page-primitives";
import { SelfAttendanceCard } from "./self-attendance-card";

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

const ownerPermission = "workspace.dashboard.admin.read";
const dashboardPermission = "attendance.records.read";
const employeesPermission = "organization.employees.read";

const statusFilters: Array<{ label: string; value: DashboardStatus | "ALL" }> =
  [
    { label: "All employees", value: "ALL" },
    { label: "Clocked in", value: "CLOCKED_IN" },
    { label: "Late", value: "LATE" },
    { label: "On field", value: "ON_FIELD" },
    { label: "On break", value: "ON_BREAK" },
    { label: "Absent", value: "ABSENT" },
    { label: "Not yet in", value: "NOT_YET_IN" },
  ];

export function TenantDashboard() {
  const user = useAuthStore((state) => state.user);
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
        if (active)
          startTransition(() => {
            setData(response.data);
            setError("");
          });
      })
      .catch(() => {
        if (active)
          setError("Live attendance could not be loaded. Please try again.");
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
      .then(({ data }) => {
        if (active) setHrSummary(data.data);
      })
      .catch(() => {
        if (active)
          setError("The HR action summary could not be loaded completely.");
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
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#4f46e5]">
              Employee workspace
            </p>
            <h1 className="mt-1 text-3xl font-bold">Today</h1>
            <p className="mt-1 text-sm text-[#777587]">
              Record your workday and review the server-confirmed state.
            </p>
          </div>
          <SelfAttendanceCard />
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-[1440px] p-5 lg:p-8">
        <ErrorState message="Your role does not include access to the workspace attendance dashboard." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 lg:p-6">
      <DashboardHeader
        userName={user?.email ?? "Workspace admin"}
        data={data}
      />
      {error && (
        <div className="mb-5">
          <ErrorState message={error} />
        </div>
      )}
      {permissions.includes("attendance.records.self.read") && (
        <div className="mb-5">
          <SelfAttendanceCard compact />
        </div>
      )}
      {canReadOwnerOverview && <OwnerOverviewPanel data={hrSummary} />}
      {hrSummary?.workforce && (
        <WorkforceOverview workforce={hrSummary.workforce} />
      )}
      {!data ? (
        <LoadingState />
      ) : (
        <>
          <SummaryStrip summary={data.summary} />
          <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <section className="min-w-0">
              <DashboardToolbar
                search={search}
                status={status}
                view={view}
                onSearch={setSearch}
                onStatus={setStatus}
                onView={setView}
              />
              <EmployeeBoard employees={data.employees} view={view} />
            </section>
            <NeedsAttention
              attention={data.attention}
              queues={hrSummary?.queues ?? null}
            />
          </div>
        </>
      )}
    </div>
  );
}

function DashboardHeader({
  userName,
  data,
}: {
  userName: string;
  data: DashboardData | null;
}) {
  const stale = data ? isStale(data.updatedAt) : false;
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4f46e5]">
          Workspace operations
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          HR operations
        </h1>
        <p className="mt-1 text-sm text-[#777587]">
          Welcome, {userName}. Review today&apos;s workforce and every queue
          that needs action.
        </p>
      </div>
      <div
        className={cn(
          "rounded-full border px-4 py-2 text-xs font-bold",
          stale
            ? "border-[#f2c078] bg-[#fff3df] text-[#895100]"
            : "border-[#bce9ca] bg-[#e8f8ed] text-[#006e2d]",
        )}
      >
        <span
          className={cn(
            "mr-2 inline-block size-2 rounded-full",
            stale ? "bg-[#d97706]" : "animate-pulse bg-[#00a642]",
          )}
        />
        {data
          ? `${stale ? "Data may be stale" : "Live"} · ${relativeUpdatedAt(data.updatedAt)}`
          : "Connecting live board..."}
      </div>
    </header>
  );
}

function OwnerOverviewPanel({ data }: { data: HrSummary | null }) {
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
      label: "Employee usage",
      value: data?.quota ? `${data.quota.used} / ${data.quota.limit}` : "—",
      detail: data?.quota
        ? `${quotaPercentage}% of available seats`
        : "Quota unavailable",
      href: "/app/employees",
      icon: UsersRound,
    },
    {
      label: "Workspace setup",
      value: setupReady ? "Ready" : "Needs setup",
      detail: setupReady
        ? "Required organization and Attendance inputs exist"
        : "Open configuration health to resolve gaps",
      href: "/app/settings/modules",
      icon: CheckCircle2,
    },
    {
      label: "Enabled modules",
      value: data?.modules?.length ?? "—",
      detail:
        data?.modules?.map((module) => module.name).join(", ") ||
        "No modules reported",
      href: "/app/modules",
      icon: Building2,
    },
    {
      label: "Workspace users",
      value: data?.access?.activeUsers ?? "—",
      detail: data?.access
        ? `${data.access.pendingInvitations} pending invitations · ${data.access.unavailableUsers} unavailable`
        : "User access unavailable",
      href: "/app/settings/access",
      icon: ShieldAlert,
    },
  ];
  return (
    <section
      aria-label="Business Admin overview"
      className="mb-5 rounded-2xl border border-[#ddd8f0] bg-gradient-to-r from-[#f4f1ff] via-white to-[#eefbf3] p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Workspace overview</h2>
          <p className="text-xs text-[#777587]">
            Business Admin controls and readiness
          </p>
        </div>
        <span className="rounded-full bg-[#3525cd] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          Owner view
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-xl border border-white bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#aaa3cd]"
          >
            <div className="flex items-start justify-between">
              <Icon className="size-5 text-[#4f46e5]" />
              <ArrowRight className="size-4 text-[#aaa3cd] transition group-hover:translate-x-0.5" />
            </div>
            <div className="mt-3 text-xl font-bold">{value}</div>
            <div className="text-xs font-semibold text-[#464555]">{label}</div>
            <p className="mt-1 truncate text-[11px] text-[#777587]">{detail}</p>
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
  const cards = [
    {
      label: "Active workforce",
      value: workforce.active,
      href: "/app/employees?status=ACTIVE",
    },
    {
      label: "On notice",
      value: workforce.onNotice,
      href: "/app/employees?status=ON_NOTICE",
    },
    {
      label: "Joining in 30 days",
      value: workforce.joiningSoon,
      href: "/app/employees?quickFilter=JOINING_SOON",
    },
    {
      label: "Missing manager",
      value: workforce.missingManager,
      href: "/app/employees?quickFilter=MISSING_MANAGER",
    },
    {
      label: "Former employees",
      value: workforce.terminated,
      href: "/app/employees?status=TERMINATED",
    },
  ];
  return (
    <section aria-label="Workforce summary" className="mb-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold">Workforce</h2>
          <p className="text-xs text-[#777587]">
            Counts follow your employee reporting scope
          </p>
        </div>
        <Link
          className="text-xs font-bold text-[#3525cd]"
          href="/app/employees"
        >
          Open directory
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <Link
            className="group rounded-xl border border-[#e4e1ee] bg-white p-4 shadow-sm transition hover:border-[#4f46e5]"
            href={card.href}
            key={card.label}
          >
            <div className="flex items-start justify-between gap-2">
              <strong className="text-2xl">{card.value}</strong>
              <ArrowRight className="size-4 text-[#aaa3cd] group-hover:text-[#3525cd]" />
            </div>
            <span className="mt-1 block text-xs font-semibold text-[#646273]">
              {card.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SummaryStrip({ summary }: { summary: DashboardData["summary"] }) {
  const cards = [
    {
      label: "Present",
      value: summary.present,
      href: "/app/attendance/register?status=CLOCKED_IN",
      tone: "text-[#006e2d]",
      accent: "bg-[#d8f8df]",
    },
    {
      label: "Late",
      value: summary.late,
      href: "/app/attendance/register?status=LATE",
      tone: "text-[#895100]",
      accent: "bg-[#ffddb0]",
    },
    {
      label: "Absent",
      value: summary.absent,
      href: "/app/attendance/register?status=ABSENT",
      tone: "text-[#ba1a1a]",
      accent: "bg-[#ffdad6]",
    },
    {
      label: "On field",
      value: summary.onField,
      href: "/app/attendance/register?status=ON_FIELD",
      tone: "text-[#006492]",
      accent: "bg-[#cbe6ff]",
    },
    {
      label: "On break",
      value: summary.onBreak,
      href: "/app/attendance/register?status=ON_BREAK",
      tone: "text-[#5d3f00]",
      accent: "bg-[#f4e4bd]",
    },
    {
      label: "Not yet in",
      value: summary.notYetIn,
      href: "/app/attendance/register?status=NOT_YET_IN",
      tone: "text-[#464555]",
      accent: "bg-[#ece9f2]",
    },
  ];
  return (
    <section
      aria-label="Attendance summary"
      className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
    >
      {cards.map((card) => (
        <Link
          href={card.href}
          key={card.label}
          className="rounded-xl border border-[#e4e1ee] bg-white p-4 shadow-sm transition hover:border-[#4f46e5]"
        >
          <div className={cn("mb-3 size-2 rounded-full", card.accent)} />
          <p className="text-xs font-medium text-[#777587]">{card.label}</p>
          <p className={cn("mt-1 text-2xl font-bold", card.tone)}>
            {card.value}
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
  return (
    <div className="mb-4 rounded-xl border border-[#e4e1ee] bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1">
          <span className="sr-only">Search dashboard employees</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#777587]" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search employees..."
            className="h-9 w-full rounded-lg bg-[#f4f1f8] pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#4f46e5]"
          />
        </label>
        <div className="ml-auto flex rounded-lg bg-[#f4f1f8] p-1">
          <button
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            onClick={() => onView("grid")}
            className={cn(
              "grid size-8 place-items-center rounded-md",
              view === "grid" && "bg-white text-[#3525cd] shadow-sm",
            )}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => onView("list")}
            className={cn(
              "grid size-8 place-items-center rounded-md",
              view === "list" && "bg-white text-[#3525cd] shadow-sm",
            )}
          >
            <List className="size-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onStatus(filter.value)}
            aria-pressed={status === filter.value}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              status === filter.value
                ? "border-[#3525cd] bg-[#3525cd] text-white"
                : "border-[#ddd8e7] bg-white text-[#646273] hover:border-[#aaa3cd]",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmployeeBoard({
  employees,
  view,
}: {
  employees: DashboardData["employees"];
  view: "grid" | "list";
}) {
  if (!employees.length)
    return (
      <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-[#c7c4d8] bg-white p-8 text-center">
        <div>
          <UsersRound className="mx-auto size-9 text-[#aaa3cd]" />
          <h2 className="mt-3 font-semibold">No employees match this view</h2>
          <p className="mt-1 text-sm text-[#777587]">
            Try another status or clear the search.
          </p>
        </div>
      </div>
    );
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
          key={employee.id}
          employee={employee}
          compact={view === "list"}
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
  const status = statusPresentation(employee.status);
  return (
    <article
      className={cn(
        "rounded-xl border border-[#e4e1ee] bg-white p-4 shadow-sm transition hover:border-[#aaa3cd]",
        compact && "flex flex-wrap items-center gap-4",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ddd8ff] to-[#d8f8df] text-sm font-bold text-[#3525cd]">
          {initials(employee.fullName)}
          <span
            className={cn(
              "absolute bottom-0 right-0 size-3 rounded-full border-2 border-white",
              status.dot,
            )}
          />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">
            {employee.fullName}
          </h3>
          <p className="truncate text-xs text-[#777587]">
            {employee.designation || employee.employeeCode} ·{" "}
            {employee.department.name}
          </p>
        </div>
      </div>
      <div
        className={cn(
          "mt-4 flex flex-wrap items-center justify-between gap-2",
          compact && "ml-auto mt-0",
        )}
      >
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
            status.badge,
          )}
        >
          {status.label}
        </span>
        <span className="text-[11px] text-[#646273]">
          {employee.checkinTime
            ? `In ${formatTime(employee.checkinTime)}`
            : "No check-in"}
        </span>
      </div>
      {!compact && (
        <div className="mt-4 flex items-center justify-between border-t border-[#f0edf5] pt-3 text-[11px] text-[#777587]">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" />
            {employee.office?.officeName || employee.workType}
          </span>
          <span>{employee.shift?.name || "No shift"}</span>
        </div>
      )}
    </article>
  );
}

function NeedsAttention({
  attention,
  queues,
}: {
  attention: DashboardData["attention"];
  queues: HrSummary["queues"] | null;
}) {
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
      label: "Pending regularizations",
      count: pendingRegularizations,
      body: "Requests awaiting review",
      href: "/app/attendance/regularizations?status=PENDING",
      icon: CalendarClock,
      tone: "bg-[#ece9ff] text-[#3525cd]",
    });
  }
  if (openSecurityAlerts !== null) {
    items.push({
      label: "Security violations",
      count: openSecurityAlerts,
      body: "Open or acknowledged alerts",
      href: "/app/attendance/security?status=OPEN",
      icon: ShieldAlert,
      tone: "bg-[#ffdad6] text-[#ba1a1a]",
    });
  }
  if (attention.absenteeAlerts !== null) {
    items.push({
      label: "Absentee alerts",
      count: attention.absenteeAlerts,
      body: "Employees past alert grace",
      href: "/app/attendance/register?status=ABSENT",
      icon: AlertTriangle,
      tone: "bg-[#ffddb0] text-[#895100]",
    });
  }
  if (queues?.pendingLeave !== null && queues?.pendingLeave !== undefined) {
    items.push({
      label: "Leave approvals",
      count: queues.pendingLeave,
      body: "Requests awaiting a decision",
      href: "/app/attendance/leave/approvals?status=PENDING",
      icon: Umbrella,
      tone: "bg-[#e4f2ff] text-[#005f8d]",
    });
  }
  if (queues?.pendingDevices !== null && queues?.pendingDevices !== undefined) {
    items.push({
      label: "Device requests",
      count: queues.pendingDevices,
      body: "Registrations awaiting approval",
      href: "/app/attendance/devices?status=PENDING_APPROVAL",
      icon: Smartphone,
      tone: "bg-[#eee9ff] text-[#3525cd]",
    });
  }
  return (
    <aside className="rounded-xl border border-[#e4e1ee] bg-white p-4 shadow-sm xl:sticky xl:top-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Needs attention</h2>
          <p className="text-xs text-[#777587]">Live operational queues</p>
        </div>
        <CircleDot className="size-5 text-[#4f46e5]" />
      </div>
      <div className="mt-4 grid gap-3">
        {items.map(({ label, count, body, href, icon: Icon, tone }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-xl border border-[#ece9f2] p-4 transition hover:border-[#aaa3cd]"
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
                  <strong className="text-xl">{count}</strong>
                  <span className="text-xs font-semibold">{label}</span>
                </div>
                <p className="mt-1 text-[11px] text-[#777587]">{body}</p>
              </div>
              <ArrowRight className="ml-auto mt-2 size-4 text-[#aaa3cd] transition group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
        {!items.length && (
          <p className="rounded-xl bg-[#f8f5fc] p-4 text-sm text-[#777587]">
            No authorized action queues are waiting for you.
          </p>
        )}
      </div>
      <Link
        href="/app/attendance/register"
        className="mt-4 flex h-10 items-center justify-center gap-2 rounded-lg border border-[#c7c4d8] text-xs font-semibold text-[#3525cd]"
      >
        Open attendance register <ArrowRight className="size-3" />
      </Link>
    </aside>
  );
}

function statusPresentation(status: DashboardStatus) {
  const values: Record<
    DashboardStatus,
    { label: string; badge: string; dot: string }
  > = {
    CLOCKED_IN: {
      label: "Clocked in",
      badge: "bg-[#d8f8df] text-[#006e2d]",
      dot: "bg-[#00a642]",
    },
    LATE: {
      label: "Late",
      badge: "bg-[#ffddb0] text-[#895100]",
      dot: "bg-[#ef9d00]",
    },
    ABSENT: {
      label: "Absent",
      badge: "bg-[#ffdad6] text-[#ba1a1a]",
      dot: "bg-[#d32f2f]",
    },
    ON_FIELD: {
      label: "On field",
      badge: "bg-[#cbe6ff] text-[#006492]",
      dot: "bg-[#0086c4]",
    },
    ON_BREAK: {
      label: "On break",
      badge: "bg-[#f4e4bd] text-[#5d3f00]",
      dot: "bg-[#c58b00]",
    },
    NOT_YET_IN: {
      label: "Not yet in",
      badge: "bg-[#ece9f2] text-[#646273]",
      dot: "bg-[#aaa3ad]",
    },
    OFF: {
      label: "Off",
      badge: "bg-[#ece9f2] text-[#646273]",
      dot: "bg-[#aaa3ad]",
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

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function relativeUpdatedAt(value: string) {
  const seconds = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 1000),
  );
  return `updated ${seconds}s ago`;
}

function isStale(value: string) {
  return Date.now() - new Date(value).getTime() > 120_000;
}

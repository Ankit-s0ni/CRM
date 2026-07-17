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
    pendingRegularizations: number;
    openSecurityViolations: number;
    absenteeAlerts: number;
  };
  updatedAt: string;
  nextCursor: string | null;
};

type OwnerOverview = {
  quota?: { used: number; limit: number; percentage: number };
  setup?: { completed: boolean; currentStep: number };
  modules?: Array<{ key: string; name: string }>;
  users?: number;
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
  const [ownerOverview, setOwnerOverview] = useState<OwnerOverview | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<DashboardStatus | "ALL">("ALL");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [error, setError] = useState("");

  const canReadDashboard =
    permissions?.includes(dashboardPermission) &&
    permissions.includes(employeesPermission);
  const canReadOwnerOverview = permissions?.includes(ownerPermission);

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
    if (!permissions || !canReadOwnerOverview) return;
    let active = true;
    Promise.all([
      optionalGet<{
        data: { used: number; limit: number; percentage: number };
      }>("/employees/quota"),
      optionalGet<{ data: { completed: boolean; currentStep: number } }>(
        "/onboarding/status",
      ),
      optionalGet<{ modules: Array<{ key: string; name: string }> }>(
        "/workspace/modules",
      ),
      optionalGet<{ data: unknown[] }>("/users"),
    ]).then(([quota, setup, modules, users]) => {
      if (!active) return;
      setOwnerOverview({
        quota: quota?.data,
        setup: setup?.data,
        modules: modules?.modules,
        users: users?.data.length,
      });
    });
    return () => {
      active = false;
    };
  }, [canReadOwnerOverview, permissions]);

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
      {canReadOwnerOverview && <OwnerOverviewPanel data={ownerOverview} />}
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
            <NeedsAttention attention={data.attention} />
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
          Live Attendance
        </h1>
        <p className="mt-1 text-sm text-[#777587]">
          Welcome, {userName}. Monitor today&apos;s workforce in one place.
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

function OwnerOverviewPanel({ data }: { data: OwnerOverview | null }) {
  const cards = [
    {
      label: "Employee usage",
      value: data?.quota ? `${data.quota.used} / ${data.quota.limit}` : "—",
      detail: data?.quota
        ? `${data.quota.percentage}% of available seats`
        : "Quota unavailable",
      href: "/app/employees",
      icon: UsersRound,
    },
    {
      label: "Workspace setup",
      value: data?.setup?.completed
        ? "Complete"
        : `Step ${data?.setup?.currentStep ?? "—"} of 4`,
      detail: data?.setup?.completed
        ? "Core setup is ready"
        : "Setup needs attention",
      href: "/app/settings/company",
      icon: CheckCircle2,
    },
    {
      label: "Enabled modules",
      value: data?.modules?.length ?? "—",
      detail:
        data?.modules?.map((module) => module.name).join(", ") ||
        "No modules reported",
      href: "/app/settings/attendance",
      icon: Building2,
    },
    {
      label: "Workspace users",
      value: data?.users ?? "—",
      detail: "Administrators and role assignments",
      href: "/app/access",
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

function SummaryStrip({ summary }: { summary: DashboardData["summary"] }) {
  const cards = [
    {
      label: "Present",
      value: summary.present,
      tone: "text-[#006e2d]",
      accent: "bg-[#d8f8df]",
    },
    {
      label: "Late",
      value: summary.late,
      tone: "text-[#895100]",
      accent: "bg-[#ffddb0]",
    },
    {
      label: "Absent",
      value: summary.absent,
      tone: "text-[#ba1a1a]",
      accent: "bg-[#ffdad6]",
    },
    {
      label: "On field",
      value: summary.onField,
      tone: "text-[#006492]",
      accent: "bg-[#cbe6ff]",
    },
    {
      label: "On break",
      value: summary.onBreak,
      tone: "text-[#5d3f00]",
      accent: "bg-[#f4e4bd]",
    },
    {
      label: "Not yet in",
      value: summary.notYetIn,
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
        <article
          key={card.label}
          className="rounded-xl border border-[#e4e1ee] bg-white p-4 shadow-sm"
        >
          <div className={cn("mb-3 size-2 rounded-full", card.accent)} />
          <p className="text-xs font-medium text-[#777587]">{card.label}</p>
          <p className={cn("mt-1 text-2xl font-bold", card.tone)}>
            {card.value}
          </p>
        </article>
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
}: {
  attention: DashboardData["attention"];
}) {
  const items = [
    {
      label: "Pending regularizations",
      count: attention.pendingRegularizations,
      body: "Requests awaiting review",
      href: "/app/attendance/regularizations",
      icon: CalendarClock,
      tone: "bg-[#ece9ff] text-[#3525cd]",
    },
    {
      label: "Security violations",
      count: attention.openSecurityViolations,
      body: "Open or acknowledged alerts",
      href: "/app/attendance/security",
      icon: ShieldAlert,
      tone: "bg-[#ffdad6] text-[#ba1a1a]",
    },
    {
      label: "Absentee alerts",
      count: attention.absenteeAlerts,
      body: "Employees past alert grace",
      href: "/app/attendance/register",
      icon: AlertTriangle,
      tone: "bg-[#ffddb0] text-[#895100]",
    },
  ];
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

async function optionalGet<T>(url: string) {
  try {
    const response = await apiClient.get<T>(url);
    return response.data;
  } catch {
    return null;
  }
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

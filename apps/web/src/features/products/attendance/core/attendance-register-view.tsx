"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Filter,
  LockKeyhole,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useDeferredValue, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { RouteFeatureInfo } from "@/features/platform/help/feature-info";
import {
  EmptyState,
  ErrorState,
  FilterField,
  LoadingState,
  Panel,
  PaginationBar,
  TableShell,
  Toolbar,
  inputClass,
  tableCellClass,
  tableClass,
  tableHeadCellClass,
  tableHeadClass,
  tableRowClass,
} from "@/shared/components/page-primitives";
import {
  formatClock,
  formatMinutes,
  localIsoDate,
  statusTone,
  type AttendanceStatus,
  type RegisterRow,
} from "@/features/products/attendance/core/attendance-runtime-types";
import { useTenantLocalization } from "@/lib/tenant-localization";
import { tenantMessage } from "@/i18n/tenant-message";

type RegisterResponse = {
  data: RegisterRow[];
  pagination: { page: number; limit: number; total: number; pages: number };
  summary: {
    statuses: Partial<Record<AttendanceStatus, number>>;
    totals: {
      totalWorkMinutes: number | null;
      lateMinutes: number | null;
      overtimeMinutes: number | null;
    };
  };
};

const statusOptions: Array<{ label: string; value: AttendanceStatus | "" }> = [
  { label: tenantMessage("All statuses"), value: "" },
  { label: tenantMessage("Present"), value: "PRESENT" },
  { label: tenantMessage("Working"), value: "PRESENT_OPEN" },
  { label: tenantMessage("Half day"), value: "HALF_DAY" },
  { label: tenantMessage("Absent"), value: "ABSENT" },
  { label: tenantMessage("On duty"), value: "ON_DUTY" },
  { label: tenantMessage("On leave"), value: "ON_LEAVE" },
  { label: tenantMessage("Holiday"), value: "HOLIDAY" },
  { label: tenantMessage("Weekly off"), value: "WEEKLY_OFF" },
];

type AttentionFilter = "" | "late" | "missing-checkout";
type RegisterFilters = {
  startDate: string;
  endDate: string;
  departmentId: string;
  officeId: string;
  status: AttendanceStatus | "";
  attention: AttentionFilter;
  search: string;
};

const validStatuses = new Set<string>(
  statusOptions.map(({ value }) => value).filter(Boolean),
);

export function AttendanceRegisterView() {
  const { tText } = useTenantLocalization();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = localIsoDate();
  const monthStart = `${today.slice(0, 8)}01`;
  const filters = registerFilters(searchParams, monthStart, today);
  const page = positivePage(searchParams.get("page"));
  const deferredSearch = useDeferredValue(filters.search);
  const [result, setResult] = useState<RegisterResponse | null>(null);
  const [error, setError] = useState("");

  function updateFilters(
    patch: Partial<RegisterFilters>,
    history: "push" | "replace" = "push",
  ) {
    const next = { ...filters, ...patch };
    if (patch.status) next.attention = "";
    if (patch.attention) next.status = "";
    navigateRegister(next, 1, history);
  }

  function navigateRegister(
    nextFilters: RegisterFilters,
    nextPage: number,
    history: "push" | "replace" = "push",
  ) {
    const href = `${pathname}?${registerSearchParams(nextFilters, nextPage)}`;
    router[history](href, { scroll: false });
  }

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      startDate: filters.startDate,
      endDate: filters.endDate,
      page: String(page),
      limit: "25",
    });
    if (filters.status) params.set("status", filters.status);
    if (filters.departmentId) {
      params.set("departmentId", filters.departmentId);
    }
    if (filters.officeId) params.set("officeId", filters.officeId);
    if (filters.attention === "late") params.set("lateOnly", "true");
    if (filters.attention === "missing-checkout") {
      params.set("missingCheckout", "true");
    }
    if (deferredSearch.trim()) params.set("search", deferredSearch.trim());
    apiClient
      .get<RegisterResponse>(`/attendance/register?${params}`)
      .then(({ data }) => {
        if (active) {
          setResult(data);
          setError("");
        }
      })
      .catch(() => {
        if (active)
          setError(
            tText("Attendance register could not be loaded. Check your date range or permissions."),
          );
      });
    return () => {
      active = false;
    };
  }, [
    deferredSearch,
    filters.endDate,
    filters.departmentId,
    filters.officeId,
    filters.startDate,
    filters.status,
    filters.attention,
    page,
  ]);

  const summary = result?.summary;
  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 lg:p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-foreground">
            {tText("Attendance operations")}</p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {tText("Attendance Register")}</h1>
            <RouteFeatureInfo />
          </div>
          <p className="mt-1 text-sm text-outline">
            {tText("Review daily evidence, hours, exceptions, and payroll locks.")}</p>
        </div>
        <button
          type="button"
          onClick={() => exportCsv(result?.data ?? [])}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold"
        >
          <Download className="size-4" />
          {tText("Export current page")}</button>
      </header>
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label={tText("Records")}
          value={String(result?.pagination.total ?? 0)}
          icon={CalendarDays}
        />
        <Metric
          label={tText("Present")}
          value={String(
            (summary?.statuses.PRESENT ?? 0) +
              (summary?.statuses.PRESENT_OPEN ?? 0),
          )}
          icon={CheckCircle2}
          tone="theme-tone-icon theme-tone-emerald"
        />
        <Metric
          label={tText("Late minutes")}
          value={formatMinutes(summary?.totals.lateMinutes ?? 0)}
          icon={Clock3}
          tone="theme-tone-icon theme-tone-amber"
        />
        <Metric
          label={tText("Overtime")}
          value={formatMinutes(summary?.totals.overtimeMinutes ?? 0)}
          icon={ShieldAlert}
          tone="theme-tone-icon theme-tone-teal"
        />
      </section>
      <Toolbar className="mb-5 items-end">
          <FilterField className="relative min-w-56 flex-1" label={tText("Search employee")}>
            <Search className="absolute bottom-3 left-3 size-4 text-outline" />
            <input
              className={`${inputClass} pl-9`}
              placeholder={tText("Name or employee ID")}
              value={filters.search}
              onChange={(event) =>
                updateFilters({ search: event.target.value }, "replace")
              }
            />
          </FilterField>
          <DateField
            label={tText("From")}
            value={filters.startDate}
            onChange={(startDate) => updateFilters({ startDate })}
          />
          <DateField
            label={tText("To")}
            value={filters.endDate}
            onChange={(endDate) => updateFilters({ endDate })}
          />
          <FilterField className="min-w-44" label={tText("Status")}>
            <select
              className={inputClass}
              value={
                filters.attention
                  ? `attention:${filters.attention}`
                  : filters.status
              }
              onChange={(event) => {
                const value = event.target.value;
                if (value.startsWith("attention:")) {
                  updateFilters({
                    attention: value.slice("attention:".length) as AttentionFilter,
                  });
                } else {
                  updateFilters({ status: value as AttendanceStatus | "" });
                }
              }}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {tText(option.label)}
                </option>
              ))}
              <option value="attention:late">{tText("Late arrival")}</option>
              <option value="attention:missing-checkout">
                {tText("Missing checkout")}</option>
            </select>
          </FilterField>
          <span className="grid size-11 place-items-center rounded-lg bg-muted text-foreground">
            <Filter className="size-4" />
          </span>
      </Toolbar>
      {error && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}
      {!result ? (
        <LoadingState />
      ) : result.data.length ? (
        <RegisterTable
          returnTo={`${pathname}?${registerSearchParams(filters, page)}`}
          rows={result.data}
        />
      ) : (
        <Panel>
          <EmptyState
            title={tText("No attendance records")}
            body={tText("No records match this date range and filter combination.")}
          />
        </Panel>
      )}
      {result && result.pagination.pages > 1 && (
        <PaginationBar
          canNext={page < result.pagination.pages}
          canPrevious={page > 1}
          label={
            <>
              {tText("Showing page")} {result.pagination.page} {tText("of")}{" "}
              {result.pagination.pages} - {result.pagination.total}{" "}
              {tText("records")}
            </>
          }
          nextLabel={tText("Next")}
          onNext={() => navigateRegister(filters, page + 1)}
          onPrevious={() => navigateRegister(filters, page - 1)}
          pageLabel={
            <>
              {tText("Page")} {result.pagination.page}
            </>
          }
          previousLabel={tText("Previous")}
        />
      )}
    </div>
  );
}

function RegisterTable({
  rows,
  returnTo,
}: {
  rows: RegisterRow[];
  returnTo: string;
}) {
  const { tText } = useTenantLocalization();
  return (
    <TableShell>
      <table className={tableClass} style={{ minWidth: "1120px" }}>
        <thead className={tableHeadClass}>
          <tr>
            <Th>{tText("Employee")}</Th>
            <Th>{tText("Date")}</Th>
            <Th>{tText("Status")}</Th>
            <Th>{tText("Shift")}</Th>
            <Th>{tText("In / Out")}</Th>
            <Th>{tText("Work")}</Th>
            <Th>{tText("Late / OT")}</Th>
            <Th>{tText("Evidence")}</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const tone = statusTone(row.status);
            return (
              <tr
                key={row.id}
                className={tableRowClass}
              >
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-lg bg-muted text-xs font-bold text-foreground">
                      {initials(row.employee.fullName)}
                    </div>
                    <div>
                      <strong className="block text-sm">
                        {row.employee.fullName}
                      </strong>
                      <span className="text-xs text-outline">
                        {row.employee.employeeCode} ·{" "}
                        {row.employee.department.name}
                      </span>
                    </div>
                  </div>
                </Td>
                <Td>
                  <span className="text-sm font-medium">
                    {new Intl.DateTimeFormat("en", {
                      day: "2-digit",
                      month: "short",
                    }).format(new Date(`${row.attendanceDate}T12:00:00`))}
                  </span>
                </Td>
                <Td>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
                      tone.className,
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", tone.dot)} />
                    {tText(tone.label)}
                  </span>
                </Td>
                <Td>
                  <span className="text-sm">
                    {row.shift?.name ?? tText("Default")}
                  </span>
                    <span className="block text-[10px] text-muted-foreground">
                    {row.employee.office?.officeName ?? tText("No office")}
                  </span>
                </Td>
                <Td>
                  <span className="text-sm">
                    {formatClock(row.firstCheckin)} –{" "}
                    {formatClock(row.lastCheckout)}
                  </span>
                </Td>
                <Td>
                  <strong className="text-sm">
                    {formatMinutes(row.workMinutes)}
                  </strong>
                  <span className="block text-[10px] text-muted-foreground">
                    {tText("Break")}{formatMinutes(row.breakMinutes)}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs theme-tone-text theme-tone-amber">
                    L {formatMinutes(row.lateMinutes)}
                  </span>
                  <span className="ml-2 text-xs theme-tone-text theme-tone-teal">
                    OT {formatMinutes(row.overtimeMinutes)}
                  </span>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    {row.isLocked && (
                      <LockKeyhole className="size-4 text-on-surface-variant" />
                    )}
                    {row.evidence.verification.failed > 0 ? (
                      <ShieldAlert className="size-4 text-error" />
                    ) : (
                      <CheckCircle2 className="size-4 theme-tone-text theme-tone-emerald" />
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {row.evidence.sources.join(", ") || tText("Calculated")}
                    </span>
                  </div>
                </Td>
                <Td>
                  <Link
                    href={`/app/attendance/register/${row.employee.id}?date=${row.attendanceDate}&returnTo=${encodeURIComponent(returnTo)}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-foreground"
                  >
                    {tText("View")}<ChevronRight className="size-3" />
                  </Link>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableShell>
  );
}

function registerFilters(
  searchParams: Readonly<URLSearchParams>,
  defaultStartDate: string,
  defaultEndDate: string,
): RegisterFilters {
  const status = searchParams.get("status") ?? "";
  return {
    startDate: searchParams.get("startDate") || defaultStartDate,
    endDate: searchParams.get("endDate") || defaultEndDate,
    departmentId: searchParams.get("departmentId") ?? "",
    officeId: searchParams.get("officeId") ?? "",
    status: validStatuses.has(status) ? (status as AttendanceStatus) : "",
    attention:
      searchParams.get("lateOnly") === "true"
        ? "late"
        : searchParams.get("missingCheckout") === "true"
          ? "missing-checkout"
          : "",
    search: searchParams.get("search") ?? "",
  };
}

function registerSearchParams(filters: RegisterFilters, page: number) {
  const params = new URLSearchParams({
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  if (filters.status) params.set("status", filters.status);
  if (filters.departmentId) params.set("departmentId", filters.departmentId);
  if (filters.officeId) params.set("officeId", filters.officeId);
  if (filters.attention === "late") params.set("lateOnly", "true");
  if (filters.attention === "missing-checkout") {
    params.set("missingCheckout", "true");
  }
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (page > 1) params.set("page", String(page));
  return params.toString();
}

function positivePage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function Metric({
  label,
  value,
  icon: Icon,
  tone = "text-foreground bg-muted",
}: {
  label: string;
  value: string;
  icon: typeof CalendarDays;
  tone?: string;
}) {
  return (
    <article className="flex items-center gap-3 rounded-xl border border-surface-variant bg-card p-4 shadow-sm">
      <span className={cn("grid size-10 place-items-center rounded-lg", tone)}>
        <Icon className="size-5" />
      </span>
      <div>
        <strong className="block text-xl">{value}</strong>
        <span className="text-xs text-outline">{label}</span>
      </div>
    </article>
  );
}
function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FilterField label={label}>
      <input
        type="date"
        className={inputClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </FilterField>
  );
}
function Th({ children }: { children?: React.ReactNode }) {
  return <th className={tableHeadCellClass}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className={tableCellClass}>{children}</td>;
}
function initials(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
function exportCsv(rows: RegisterRow[]) {
  const values = [
    [
      "Date",
      "Employee",
      "Code",
      "Status",
      "Check in",
      "Check out",
      "Work minutes",
      "Late minutes",
      "Overtime minutes",
    ],
    ...rows.map((row) => [
      row.attendanceDate,
      row.employee.fullName,
      row.employee.employeeCode,
      row.status,
      row.firstCheckin ?? "",
      row.lastCheckout ?? "",
      row.workMinutes,
      row.lateMinutes,
      row.overtimeMinutes,
    ]),
  ];
  const blob = new Blob(
    [
      values
        .map((row) =>
          row
            .map((item) => `"${String(item).replaceAll('"', '""')}"`)
            .join(","),
        )
        .join("\n"),
    ],
    { type: "text/csv" },
  );
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "attendance-register.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

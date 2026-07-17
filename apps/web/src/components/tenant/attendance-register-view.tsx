"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Filter,
  LockKeyhole,
  Search,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  inputClass,
} from "./page-primitives";
import {
  formatClock,
  formatMinutes,
  localIsoDate,
  statusTone,
  type AttendanceStatus,
  type RegisterRow,
} from "./attendance-runtime-types";

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
  { label: "All statuses", value: "" },
  { label: "Present", value: "PRESENT" },
  { label: "Working", value: "PRESENT_OPEN" },
  { label: "Half day", value: "HALF_DAY" },
  { label: "Absent", value: "ABSENT" },
  { label: "On duty", value: "ON_DUTY" },
  { label: "On leave", value: "ON_LEAVE" },
  { label: "Holiday", value: "HOLIDAY" },
  { label: "Weekly off", value: "WEEKLY_OFF" },
];

export function AttendanceRegisterView() {
  const today = localIsoDate();
  const monthStart = `${today.slice(0, 8)}01`;
  const [filters, setFilters] = useState({
    startDate: monthStart,
    endDate: today,
    status: "",
    search: "",
  });
  const deferredSearch = useDeferredValue(filters.search);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<RegisterResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      startDate: filters.startDate,
      endDate: filters.endDate,
      page: String(page),
      limit: "25",
    });
    if (filters.status) params.set("status", filters.status);
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
            "Attendance register could not be loaded. Check your date range or permissions.",
          );
      });
    return () => {
      active = false;
    };
  }, [
    deferredSearch,
    filters.endDate,
    filters.startDate,
    filters.status,
    page,
  ]);

  const summary = result?.summary;
  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 lg:p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#4f46e5]">
            Attendance operations
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Attendance Register
          </h1>
          <p className="mt-1 text-sm text-[#777587]">
            Review daily evidence, hours, exceptions, and payroll locks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => exportCsv(result?.data ?? [])}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#c7c4d8] bg-white px-4 text-sm font-semibold"
        >
          <Download className="size-4" />
          Export current page
        </button>
      </header>
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Records"
          value={String(result?.pagination.total ?? 0)}
          icon={CalendarDays}
        />
        <Metric
          label="Present"
          value={String(
            (summary?.statuses.PRESENT ?? 0) +
              (summary?.statuses.PRESENT_OPEN ?? 0),
          )}
          icon={CheckCircle2}
          tone="text-[#006e2d] bg-[#d8f8df]"
        />
        <Metric
          label="Late minutes"
          value={formatMinutes(summary?.totals.lateMinutes ?? 0)}
          icon={Clock3}
          tone="text-[#895100] bg-[#ffddb0]"
        />
        <Metric
          label="Overtime"
          value={formatMinutes(summary?.totals.overtimeMinutes ?? 0)}
          icon={ShieldAlert}
          tone="text-[#006492] bg-[#cbe6ff]"
        />
      </section>
      <Panel className="mb-5 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="relative min-w-56 flex-1">
            <span className="mb-1 block text-xs font-semibold">
              Search employee
            </span>
            <Search className="absolute bottom-3 left-3 size-4 text-[#777587]" />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Name or employee ID"
              value={filters.search}
              onChange={(event) => {
                setPage(1);
                setFilters({ ...filters, search: event.target.value });
              }}
            />
          </label>
          <DateField
            label="From"
            value={filters.startDate}
            onChange={(startDate) => {
              setPage(1);
              setFilters({ ...filters, startDate });
            }}
          />
          <DateField
            label="To"
            value={filters.endDate}
            onChange={(endDate) => {
              setPage(1);
              setFilters({ ...filters, endDate });
            }}
          />
          <label className="min-w-44">
            <span className="mb-1 block text-xs font-semibold">Status</span>
            <select
              className={inputClass}
              value={filters.status}
              onChange={(event) => {
                setPage(1);
                setFilters({ ...filters, status: event.target.value });
              }}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <span className="grid size-11 place-items-center rounded-xl bg-[#ece9ff] text-[#3525cd]">
            <Filter className="size-4" />
          </span>
        </div>
      </Panel>
      {error && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}
      {!result ? (
        <LoadingState />
      ) : result.data.length ? (
        <RegisterTable rows={result.data} />
      ) : (
        <Panel>
          <EmptyState
            title="No attendance records"
            body="No records match this date range and filter combination."
          />
        </Panel>
      )}
      {result && result.pagination.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[#646273]">
          <span>
            Showing page {result.pagination.page} of {result.pagination.pages} ·{" "}
            {result.pagination.total} records
          </span>
          <div className="flex gap-2">
            <button
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              className="grid size-9 place-items-center rounded-lg border border-[#c7c4d8] bg-white disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              aria-label="Next page"
              disabled={page >= result.pagination.pages}
              onClick={() => setPage((value) => value + 1)}
              className="grid size-9 place-items-center rounded-lg border border-[#c7c4d8] bg-white disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RegisterTable({ rows }: { rows: RegisterRow[] }) {
  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[1120px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#e4e1ee] bg-[#f5f2ff] text-[10px] font-bold uppercase tracking-wider text-[#777587]">
            <Th>Employee</Th>
            <Th>Date</Th>
            <Th>Status</Th>
            <Th>Shift</Th>
            <Th>In / Out</Th>
            <Th>Work</Th>
            <Th>Late / OT</Th>
            <Th>Evidence</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const tone = statusTone(row.status);
            return (
              <tr
                key={row.id}
                className="border-b border-[#eeeaf3] transition last:border-0 hover:bg-[#fbfaff]"
              >
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-[#ddd8ff] to-[#d8f8df] text-xs font-bold text-[#3525cd]">
                      {initials(row.employee.fullName)}
                    </div>
                    <div>
                      <strong className="block text-sm">
                        {row.employee.fullName}
                      </strong>
                      <span className="text-xs text-[#777587]">
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
                    {tone.label}
                  </span>
                </Td>
                <Td>
                  <span className="text-sm">
                    {row.shift?.name ?? "Default"}
                  </span>
                  <span className="block text-[10px] text-[#777587]">
                    {row.employee.office?.officeName ?? "No office"}
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
                  <span className="block text-[10px] text-[#777587]">
                    Break {formatMinutes(row.breakMinutes)}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs text-[#895100]">
                    L {formatMinutes(row.lateMinutes)}
                  </span>
                  <span className="ml-2 text-xs text-[#006492]">
                    OT {formatMinutes(row.overtimeMinutes)}
                  </span>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    {row.isLocked && (
                      <LockKeyhole className="size-4 text-[#646273]" />
                    )}
                    {row.evidence.verification.failed > 0 ? (
                      <ShieldAlert className="size-4 text-[#ba1a1a]" />
                    ) : (
                      <CheckCircle2 className="size-4 text-[#006e2d]" />
                    )}
                    <span className="text-[10px] text-[#777587]">
                      {row.evidence.sources.join(", ") || "Calculated"}
                    </span>
                  </div>
                </Td>
                <Td>
                  <Link
                    href={`/app/attendance/register/${row.employee.id}?date=${row.attendanceDate}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#3525cd]"
                  >
                    View <ChevronRight className="size-3" />
                  </Link>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone = "text-[#3525cd] bg-[#ece9ff]",
}: {
  label: string;
  value: string;
  icon: typeof CalendarDays;
  tone?: string;
}) {
  return (
    <article className="flex items-center gap-3 rounded-xl border border-[#e4e1ee] bg-white p-4 shadow-sm">
      <span className={cn("grid size-10 place-items-center rounded-lg", tone)}>
        <Icon className="size-5" />
      </span>
      <div>
        <strong className="block text-xl">{value}</strong>
        <span className="text-xs text-[#777587]">{label}</span>
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
    <label>
      <span className="mb-1 block text-xs font-semibold">{label}</span>
      <input
        type="date"
        className={inputClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-4">{children}</td>;
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

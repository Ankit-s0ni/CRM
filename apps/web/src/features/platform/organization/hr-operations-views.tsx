"use client";

import {
  Banknote,
  Bell,
  CalendarCheck,
  Check,
  Clock3,
  Download,
  FileSpreadsheet,
  LockKeyhole,
  Plus,
  RotateCcw,
  ShieldAlert,
  UsersRound,
  X,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useSearchParams, useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { FeatureInfo } from "@/features/platform/help/feature-info";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useTenantLocalization } from "@/lib/tenant-localization";
import {
  AdminPage,
  EmptyState,
  ErrorState,
  Field,
  FilterField,
  LoadingState,
  Panel,
  PrimaryButton,
  StatusBadge,
  Toolbar,
  inputClass,
} from "@/shared/components/page-primitives";

type Employee = { id: string; employeeCode: string; fullName: string };
type RequestState = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
type Regularization = {
  id: string;
  status: RequestState;
  reason: string;
  requestedCheckin?: string | null;
  requestedCheckout?: string | null;
  managerComments?: string | null;
  createdAt: string;
  employee: Employee;
  attendanceLog: {
    attendanceDate: string;
    firstCheckin?: string | null;
    lastCheckout?: string | null;
    attendanceStatus: string;
  };
};
type ReportJob = {
  id: string;
  reportType:
    "MUSTER" | "PAYROLL" | "LATE_OT" | "VIOLATIONS" | "FIELD_DISTANCE";
  period: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  format: "CSV" | "XLSX" | "PDF";
  checksum?: string | null;
  failureMessage?: string | null;
  contractVersion: number;
  createdAt: string;
  completedAt?: string | null;
  expiresAt?: string | null;
};
type PayrollLock = {
  id: string;
  period: string;
  status: "LOCKED" | "REOPENED";
  lockedAt?: string | null;
  reopenedAt?: string | null;
  reopenReason?: string | null;
  export?: { id: string; checksum?: string | null } | null;
  history: Array<{
    id: string;
    action: string;
    reason?: string | null;
    createdAt: string;
  }>;
};
type LeavePolicy = {
  id: string;
  name: string;
  leaveType: string;
  isActive: boolean;
  version?: number;
  accrualLogic?: {
    annualEntitlement?: number;
    carryForwardLimit?: number;
  };
};
type LeaveBalance = {
  id: string;
  remainingDays: string | number;
  policy: LeavePolicy;
  employee?: Employee;
};
type LeaveRequest = {
  id: string;
  employeeId: string;
  status: RequestState;
  startDate: string;
  endDate: string;
  halfDayStart: boolean;
  halfDayEnd: boolean;
  totalDays: number;
  reason?: string | null;
  managerComments?: string | null;
  employee: Employee;
  policy: LeavePolicy;
};
type InboxItem = {
  id: string;
  eventKey: string;
  severity: string;
  title: string;
  body: string;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: string;
};

export function RegularizationQueueView() {
  const { tText } = useTenantLocalization();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Regularization[] | null>(null);
  const status = requestStatus(searchParams.get("status"));
  const [error, setError] = useState("");
  const load = () =>
    apiClient
      .get(`/regularizations?status=${status}&page=1&limit=100`)
      .then(({ data }) => {
        setError("");
        setItems(data.data);
      })
      .catch((reason) => {
        setItems([]);
        setError(
          apiError(reason, "Regularization requests could not be loaded."),
        );
      });
  useEffect(() => {
    void load();
  }, [status]);
  return (
    <AdminPage
      title={tText("Attendance corrections")}
      description={tText(
        "Review correction requests by age, evidence, and reporting scope.",
      )}
      action={
        <select
          aria-label={tText("Request status")}
          className={inputClass}
          value={status}
          onChange={(event) => {
            const nextStatus = requestStatus(event.target.value);
            router.push(`${pathname}?status=${nextStatus}`, { scroll: false });
          }}
        >
          <option value="PENDING">{tText("Pending")}</option>
          <option value="APPROVED">{tText("Approved")}</option>
          <option value="REJECTED">{tText("Rejected")}</option>
          <option value="CANCELLED">{tText("Cancelled")}</option>
        </select>
      }
    >
      {error && <ErrorState message={error} />}
      {!items ? (
        <LoadingState />
      ) : (
        <Panel className="overflow-hidden">
          {items.length ? (
            items.map((item) => (
              <Link
                className="grid gap-3 border-b border-surface-variant p-5 transition last:border-0 hover:bg-muted md:grid-cols-[1fr_170px_130px_110px] md:items-center"
                href={`/app/attendance/regularizations/${item.id}?returnTo=${encodeURIComponent(`${pathname}?status=${status}`)}`}
                key={item.id}
              >
                <div>
                  <div className="font-semibold">{item.employee.fullName}</div>
                  <div className="mt-1 text-xs text-outline">
                    {item.employee.employeeCode} · {item.reason}
                  </div>
                </div>
                <div className="text-sm">
                  <span className="block text-xs text-outline">
                    {tText("Attendance date")}
                  </span>
                  {dateOnly(item.attendanceLog.attendanceDate)}
                </div>
                <div className="text-sm">
                  <span className="block text-xs text-outline">
                    {tText("Waiting")}
                  </span>
                  {age(item.createdAt)}
                </div>
                <StatusPill value={item.status} />
              </Link>
            ))
          ) : (
            <EmptyState
              title={tText("Queue is clear")}
              body={tText("There are no correction requests in this state.")}
            />
          )}
        </Panel>
      )}
    </AdminPage>
  );
}

export function RegularizationDetailView({ returnTo }: { returnTo: string }) {
  const { tText } = useTenantLocalization();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Regularization | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () =>
    apiClient
      .get(`/regularizations/${id}`)
      .then(({ data }) => setItem(data.data))
      .catch(() =>
        setError(tText("This request is unavailable or outside your scope.")),
      );
  useEffect(() => {
    void load();
  }, [id]);
  async function decide(action: "approve" | "reject") {
    if (!comment.trim())
      return setError(tText("Add a decision comment before continuing."));
    if (
      !window.confirm(
        `${action === "approve" ? "Approve" : "Reject"} this correction?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    await apiClient
      .post(`/regularizations/${id}/${action}`, { comment })
      .then(() => load())
      .catch((reason) =>
        setError(apiError(reason, "The decision could not be saved.")),
      )
      .finally(() => setBusy(false));
  }
  if (!item && !error)
    return (
      <AdminPage
        title={tText("Correction request")}
        description={tText("Loading request evidence and recompute preview.")}
      >
        <LoadingState />
      </AdminPage>
    );
  return (
    <AdminPage
      title={tText("Correction decision")}
      description={tText(
        "Compare immutable attendance evidence with the requested correction.",
      )}
      action={
        <Link className="text-sm font-semibold text-foreground" href={returnTo}>
          {tText("Back to queue")}
        </Link>
      }
    >
      {error && <ErrorState message={error} />}
      {item && (
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="grid gap-5">
            <Panel className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">
                    {item.employee.fullName}
                  </h2>
                  <p className="text-sm text-outline">
                    {item.employee.employeeCode} ·{" "}
                    {dateOnly(item.attendanceLog.attendanceDate)}
                  </p>
                </div>
                <StatusPill value={item.status} />
              </div>
              <p className="mt-5 rounded-xl bg-muted p-4 text-sm leading-6">
                {item.reason}
              </p>
            </Panel>
            <Panel className="overflow-hidden">
              <div className="grid grid-cols-3 bg-primary-container px-5 py-3 text-xs font-bold uppercase tracking-wider text-on-tone">
                <span>{tText("Evidence")}</span>
                <span>{tText("Recorded")}</span>
                <span>{tText("Requested")}</span>
              </div>
              <Comparison
                label={tText("Check-in")}
                current={time(item.attendanceLog.firstCheckin)}
                requested={time(item.requestedCheckin)}
              />
              <Comparison
                label={tText("Checkout")}
                current={time(item.attendanceLog.lastCheckout)}
                requested={time(item.requestedCheckout)}
              />
              <Comparison
                label={tText("Result")}
                current={item.attendanceLog.attendanceStatus}
                requested="Recompute on approval"
              />
            </Panel>
          </div>
          <Panel className="h-fit p-6">
            <h2 className="font-bold">{tText("Decision")}</h2>
            {item.status === "PENDING" ? (
              <>
                <Field label={tText("Audit comment")}>
                  <textarea
                    className={`${inputClass} mt-4 h-28 py-3`}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                  />
                </Field>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    className="h-11 rounded-xl border border-error font-semibold text-error"
                    disabled={busy}
                    onClick={() => decide("reject")}
                  >
                    <X className="mr-2 inline size-4" />
                    {tText("Reject")}
                  </button>
                  <PrimaryButton
                    disabled={busy}
                    onClick={() => decide("approve")}
                  >
                    <Check className="size-4" />
                    {tText("Approve")}
                  </PrimaryButton>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {item.managerComments || tText("Decision completed.")}
              </p>
            )}
          </Panel>
        </div>
      )}
    </AdminPage>
  );
}

function requestStatus(value: string | null): RequestState {
  return value === "APPROVED" || value === "REJECTED" || value === "CANCELLED"
    ? value
    : "PENDING";
}

export function ReportsCenterView({
  initialType = "MUSTER",
}: {
  initialType?: ReportJob["reportType"];
} = {}) {
  const { t, tText, formatDate } = useTenantLocalization();
  const [jobs, setJobs] = useState<ReportJob[] | null>(null);
  const [type, setType] = useState<ReportJob["reportType"]>(initialType);
  const [period, setPeriod] = useState("2026-07");
  const [status, setStatus] = useState<ReportJob["status"] | "ALL">("ALL");
  const [moduleKeys, setModuleKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canGenerate = permissions.includes("attendance.reports.generate");
  const reportTypes: ReportJob["reportType"][] = [
    "MUSTER",
    ...(moduleKeys.has("PAYROLL") ? (["PAYROLL"] as const) : []),
    "LATE_OT",
    "VIOLATIONS",
    "FIELD_DISTANCE",
  ];
  const visibleJobs =
    status === "ALL" ? jobs : jobs?.filter((job) => job.status === status);
  const reportCards = [
    {
      type: "MUSTER" as const,
      title: tText("Attendance register"),
      body: tText("Daily present, absent, late, overtime, break, and shift details."),
      icon: CalendarCheck,
      show: true,
    },
    {
      type: "PAYROLL" as const,
      title: tText("Payroll register"),
      body: tText("Salary-ready attendance snapshot for payroll runs and finance review."),
      icon: Banknote,
      show: moduleKeys.has("PAYROLL"),
    },
    {
      type: "LATE_OT" as const,
      title: tText("Late & overtime"),
      body: tText("Late minutes, early exits, overtime, and payable time review."),
      icon: Clock3,
      show: true,
    },
    {
      type: "VIOLATIONS" as const,
      title: tText("Violations"),
      body: tText("Geofence, verification, exception, and security-related attendance issues."),
      icon: ShieldAlert,
      show: true,
    },
    {
      type: "FIELD_DISTANCE" as const,
      title: tText("Field distance"),
      body: tText("Route distance and field movement export for mobile workers."),
      icon: UsersRound,
      show: true,
    },
  ].filter(({ show }) => show);
  const load = () =>
    apiClient
      .get("/reports?page=1&limit=100")
      .then(({ data }) => setJobs(data.data))
      .catch(() => setError(tText("Report jobs could not be loaded.")));
  useEffect(() => {
    void load();
    apiClient
      .get<{ modules: Array<{ key: string }> }>("/workspace/modules")
      .then(({ data }) => {
        const enabled = new Set(data.modules.map(({ key }) => key));
        setModuleKeys(enabled);
        if (initialType === "PAYROLL" && !enabled.has("PAYROLL")) {
          setType("MUSTER");
        }
      })
      .catch(() => setModuleKeys(new Set()));
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [initialType]);
  async function create(
    reportType: ReportJob["reportType"] = type,
    reportPeriod = period,
  ) {
    setBusy(true);
    setError("");
    await apiClient
      .post(reportEndpoint(reportType), {
        period: reportPeriod,
        format: reportType === "MUSTER" ? "XLSX" : "CSV",
      })
      .then(() => load())
      .catch((reason) =>
        setError(apiError(reason, "The report could not be queued.")),
      )
      .finally(() => setBusy(false));
  }
  async function download(id: string) {
    try {
      const { data } = await apiClient.get(`/reports/${id}/download`);
      window.location.assign(data.data.url);
    } catch (reason) {
      setError(apiError(reason, "The export is not ready or has expired."));
    }
  }
  return (
    <AdminPage
      title={tText("Reports")}
      description={tText(
        "Generate attendance, payroll, field, and audit-ready exports from one place.",
      )}
      action={
        <div className="flex flex-wrap gap-2">
          <select
            aria-label={tText("Report type")}
            className={inputClass}
            value={type}
            onChange={(event) =>
              setType(event.target.value as ReportJob["reportType"])
            }
          >
            {reportTypes.map((value) => (
              <option key={value} value={value}>
                {reportLabel(value, undefined, tText)}
              </option>
            ))}
          </select>
          <input
            aria-label={tText("Report period")}
            className={inputClass}
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          />
          {canGenerate && (
            <PrimaryButton disabled={busy} onClick={() => create()}>
              <Plus className="size-4" />
              {tText("Generate")}
            </PrimaryButton>
          )}
        </div>
      }
    >
      {error && <ErrorState message={error} />}
      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reportCards.map(({ type: cardType, title, body, icon: Icon }) => (
          <Panel
            className="relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
            key={cardType}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-border via-border to-border" />
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-bold">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {body}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="inline-flex min-h-10 items-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
                onClick={() => setType(cardType)}
                type="button"
              >
                {tText("Select")}
              </button>
              {canGenerate && (
                <button
                  className="inline-flex min-h-10 items-center rounded-xl bg-foreground px-4 text-sm font-semibold text-on-tone transition hover:bg-primary-container disabled:opacity-50"
                  disabled={busy}
                  onClick={() => create(cardType)}
                  type="button"
                >
                  <Plus className="mr-2 size-4" />
                  {tText("Generate")}
                </button>
              )}
            </div>
          </Panel>
        ))}
      </div>
      <Toolbar className="mb-5">
        <FilterField label={tText("Job status")} className="min-w-48">
          <select
            className={inputClass}
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
          >
            {["ALL", "PENDING", "RUNNING", "COMPLETED", "FAILED"].map(
              (value) => (
                <option key={value} value={value}>
                  {reportStatusLabel(value, tText)}
                </option>
              ),
            )}
          </select>
        </FilterField>
        <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
          {tText(
            "Jobs refresh automatically. Failed jobs can be generated again with the same period.",
          )}
        </p>
      </Toolbar>
      {!jobs ? (
        <LoadingState />
      ) : (
        <Panel className="overflow-hidden">
          <div className="border-b border-border bg-muted px-6 py-4">
            <h2 className="font-semibold">{tText("Report history")}</h2>
            <p className="text-sm text-muted-foreground">
              {tText("Download completed exports, retry failed jobs, and regenerate older attendance workbooks.")}
            </p>
          </div>
          {visibleJobs?.length ? (
            visibleJobs.map((job) => {
              const expired =
                job.status === "COMPLETED" &&
                job.expiresAt &&
                new Date(job.expiresAt) <= new Date();
              const legacyAttendanceExport =
                job.reportType === "MUSTER" &&
                (job.contractVersion < 3 || job.format !== "XLSX");
              return (
                <div
                  className="grid gap-3 border-b border-surface-variant p-5 last:border-0 md:grid-cols-[1fr_140px_140px_150px] md:items-center"
                  key={job.id}
                >
                  <div>
                    <div className="flex items-center gap-2 font-semibold">
                      <FileSpreadsheet className="size-4 text-foreground" />
                      {reportLabel(job.reportType, job.contractVersion, tText)}
                    </div>
                    <div className="mt-1 text-xs text-outline">
                      {job.period} · {job.format}{" "}
                      {job.reportType === "MUSTER" &&
                        job.contractVersion >= 3 &&
                        `· ${tText("One tab per working day")} `}
                      {tText("· contract v")}
                      {job.contractVersion}{" "}
                      {job.checksum ? `· ${job.checksum.slice(0, 12)}…` : ""}
                    </div>
                    {job.failureMessage && (
                      <div className="mt-1 text-xs text-on-error-container">
                        {job.failureMessage}
                      </div>
                    )}
                  </div>
                  <span className="text-sm">
                    {formatDate(job.createdAt, {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <StatusPill value={expired ? "EXPIRED" : job.status} />
                  {legacyAttendanceExport && canGenerate ? (
                    <button
                      className="h-10 rounded-lg border border-border text-sm font-semibold text-foreground"
                      disabled={busy}
                      onClick={() => create("MUSTER", job.period)}
                    >
                      <RotateCcw className="mr-2 inline size-4" />
                      {tText("Generate workbook")}
                    </button>
                  ) : job.status === "FAILED" && canGenerate ? (
                    <button
                      className="h-10 rounded-lg border border-border text-sm font-semibold text-foreground"
                      disabled={busy}
                      onClick={() => create(job.reportType, job.period)}
                    >
                      <RotateCcw className="mr-2 inline size-4" />
                      {tText("Generate again")}
                    </button>
                  ) : (
                    <button
                      className="h-10 rounded-lg border border-border text-sm font-semibold text-foreground disabled:opacity-40"
                      disabled={job.status !== "COMPLETED" || Boolean(expired)}
                      onClick={() => download(job.id)}
                    >
                      <Download className="mr-2 inline size-4" />
                      {expired
                        ? t("common.status.expired", "Expired")
                        : tText("Download")}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <EmptyState
              title={tText("No report jobs")}
              body={
                status === "ALL"
                  ? "Generate an Attendance export to create the first report job."
                  : `No ${status.toLowerCase()} report jobs match this filter.`
              }
            />
          )}
        </Panel>
      )}
      <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold text-foreground">
        <Link href="/app/attendance/register">
          {tText("Open Attendance register")}
        </Link>
        {moduleKeys.has("PAYROLL") && (
          <Link href="/app/modules/payroll">
            {tText("Review payroll locks")}
          </Link>
        )}
      </div>
    </AdminPage>
  );
}

export function PayrollLockView() {
  const { tText } = useTenantLocalization();
  const [locks, setLocks] = useState<PayrollLock[] | null>(null);
  const [exports, setExports] = useState<ReportJob[]>([]);
  const [period, setPeriod] = useState("2026-07");
  const [exportId, setExportId] = useState("");
  const [error, setError] = useState("");
  const load = () =>
    Promise.all([
      apiClient.get("/payroll-locks"),
      apiClient.get(
        "/reports?reportType=PAYROLL&status=COMPLETED&page=1&limit=100",
      ),
    ])
      .then(([lockResult, exportResult]) => {
        setLocks(lockResult.data.data);
        setExports(exportResult.data.data);
      })
      .catch(() => setError(tText("Payroll lock data could not be loaded.")));
  useEffect(() => {
    void load();
  }, []);
  async function lock() {
    if (
      !exportId ||
      !window.confirm(`Lock ${period}? Attendance mutations will stop.`)
    )
      return;
    await apiClient
      .post("/payroll-locks", { period, exportId })
      .then(load)
      .catch((reason) =>
        setError(apiError(reason, "The month could not be locked.")),
      );
  }
  async function reopen(item: PayrollLock) {
    const reason = window.prompt(`Why must ${item.period} be reopened?`);
    if (!reason) return;
    await apiClient
      .post(`/payroll-locks/${item.id}/reopen`, { reason })
      .then(load)
      .catch((cause) =>
        setError(apiError(cause, "The month could not be reopened.")),
      );
  }
  return (
    <AdminPage
      title={tText("Payroll close")}
      description={tText(
        "Lock a finalized month against a completed payroll export, with an immutable reopen trail.",
      )}
      action={
        <Link
          className="text-sm font-semibold text-foreground"
          href="/app/attendance/reports"
        >
          {tText("Open reports center")}
        </Link>
      }
    >
      {error && <ErrorState message={error} />}
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Panel className="h-fit p-6">
          <div className="grid size-11 place-items-center rounded-xl bg-primary-container text-on-tone">
            <LockKeyhole className="size-5" />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <h2 className="text-lg font-bold">
              {tText("Close a payroll month")}
            </h2>
            <FeatureInfo helpKey="payroll-lock" />
          </div>
          <div className="mt-4 rounded-xl border theme-tone theme-tone-amber p-4 text-sm leading-6">
            {tText(
              "Locking freezes attendance, corrections, OD/WFH changes, and leave integration for the selected period. Confirm the completed payroll export and affected month before continuing.",
            )}
          </div>
          <div className="mt-5 grid gap-4">
            <Field label={tText("Period")}>
              <input
                className={inputClass}
                type="month"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              />
            </Field>
            <Field label={tText("Completed payroll export")}>
              <select
                className={inputClass}
                value={exportId}
                onChange={(event) => setExportId(event.target.value)}
              >
                <option value="">{tText("Select export")}</option>
                {exports
                  .filter((item) => item.period === period)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id.slice(0, 8)} · {item.checksum?.slice(0, 10)}
                    </option>
                  ))}
              </select>
            </Field>
            <PrimaryButton disabled={!exportId} onClick={lock}>
              <LockKeyhole className="size-4" />
              {tText("Lock month")}
            </PrimaryButton>
          </div>
        </Panel>
        {!locks ? (
          <LoadingState />
        ) : (
          <Panel className="overflow-hidden">
            {locks.length ? (
              locks.map((item) => (
                <div
                  className="border-b border-surface-variant p-5 last:border-0"
                  key={item.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xl font-bold">{item.period}</div>
                      <div className="mt-1 text-xs text-outline">
                        {tText("Export")}
                        {item.export?.id.slice(0, 8)} ·{" "}
                        {item.export?.checksum?.slice(0, 12)}…
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusPill value={item.status} />
                      {item.status === "LOCKED" && (
                        <button
                          className="h-9 rounded-lg border border-border px-3 text-sm font-semibold"
                          onClick={() => reopen(item)}
                        >
                          <RotateCcw className="mr-1 inline size-4" />
                          {tText("Reopen")}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.history.map((entry) => (
                      <span
                        className="rounded-lg bg-muted px-3 py-2 text-xs"
                        key={entry.id}
                      >
                        {entry.action} · {dateTime(entry.createdAt)}
                        {entry.reason ? ` · ${entry.reason}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title={tText("No closed periods")}
                body={tText(
                  "Generate a payroll export before locking the first month.",
                )}
              />
            )}
          </Panel>
        )}
      </div>
    </AdminPage>
  );
}

export function LeaveBalancesView() {
  const { tText } = useTenantLocalization();
  const [balances, setBalances] = useState<LeaveBalance[] | null>(null);
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    policyId: "",
    startDate: "2026-07-20",
    endDate: "2026-07-20",
    halfDayStart: false,
    halfDayEnd: false,
    reason: "",
  });
  const load = () =>
    Promise.all([
      apiClient.get("/leave-balances/me"),
      apiClient.get("/leave-policies"),
    ])
      .then(([balanceResult, policyResult]) => {
        setBalances(balanceResult.data.data);
        setPolicies(policyResult.data.data);
      })
      .catch(() => setError(tText("Leave balances could not be loaded.")));
  useEffect(() => {
    void load();
  }, []);
  async function submit() {
    await apiClient
      .post("/leave-requests", form)
      .then(() => {
        setOpen(false);
        load();
      })
      .catch((reason) =>
        setError(apiError(reason, "Leave could not be submitted.")),
      );
  }
  return (
    <AdminPage
      title={tText("My leave")}
      description={tText(
        "Review available entitlement and request full or half-day leave.",
      )}
      action={
        <PrimaryButton onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          {tText("Apply for leave")}
        </PrimaryButton>
      }
    >
      {error && <ErrorState message={error} />}
      {!balances ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {balances.map((balance) => (
            <Panel className="p-6" key={balance.id}>
              <div className="grid size-11 place-items-center rounded-xl bg-muted text-foreground">
                <CalendarCheck />
              </div>
              <div className="mt-5 text-sm text-outline">
                {balance.policy.name}
              </div>
              <div className="mt-1 text-4xl font-bold">
                {Number(balance.remainingDays)}
                <span className="ml-2 text-base font-medium text-outline">
                  {tText("days")}
                </span>
              </div>
            </Panel>
          ))}
        </div>
      )}
      {open && (
        <Modal title={tText("Apply for leave")} onClose={() => setOpen(false)}>
          <div className="grid gap-4">
            <Field label={tText("Leave type")}>
              <select
                className={inputClass}
                value={form.policyId}
                onChange={(event) =>
                  setForm({ ...form, policyId: event.target.value })
                }
              >
                <option value="">{tText("Select policy")}</option>
                {policies
                  .filter((item) => item.isActive)
                  .map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={tText("Starts")}>
                <input
                  className={inputClass}
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm({ ...form, startDate: event.target.value })
                  }
                />
              </Field>
              <Field label={tText("Ends")}>
                <input
                  className={inputClass}
                  type="date"
                  value={form.endDate}
                  onChange={(event) =>
                    setForm({ ...form, endDate: event.target.value })
                  }
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <CheckField
                label={tText("Half-day start")}
                checked={form.halfDayStart}
                onChange={(checked) =>
                  setForm({ ...form, halfDayStart: checked })
                }
              />
              <CheckField
                label={tText("Half-day end")}
                checked={form.halfDayEnd}
                onChange={(checked) =>
                  setForm({ ...form, halfDayEnd: checked })
                }
              />
            </div>
            <Field label={tText("Reason")}>
              <textarea
                className={`${inputClass} h-24 py-3`}
                value={form.reason}
                onChange={(event) =>
                  setForm({ ...form, reason: event.target.value })
                }
              />
            </Field>
            <PrimaryButton
              disabled={!form.policyId || form.reason.length < 3}
              onClick={submit}
            >
              {tText("Submit request")}
            </PrimaryButton>
          </div>
        </Modal>
      )}
    </AdminPage>
  );
}

export function LeaveRequestsView({
  approvals = false,
}: {
  approvals?: boolean;
}) {
  const { tText } = useTenantLocalization();
  const [items, setItems] = useState<LeaveRequest[] | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [policiesConfigured, setPoliciesConfigured] = useState<boolean | null>(
    null,
  );
  const [error, setError] = useState("");
  const permissions = new Set(
    useAuthStore((state) => state.user?.permissions ?? []),
  );
  const canDecide =
    permissions.has("leave.approve") || permissions.has("leave.manage");
  const searchParams = useSearchParams();
  const employeeId = searchParams.get("employeeId");
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo = requestedReturnTo?.startsWith("/app/")
    ? requestedReturnTo
    : null;
  const load = () => {
    return Promise.all([
      apiClient.get(
        `/leave-requests?${approvals ? "status=PENDING&" : ""}${employeeId ? `employeeId=${encodeURIComponent(employeeId)}&` : ""}page=${page}&limit=20`,
      ),
      apiClient.get<{ data: LeavePolicy[] }>("/leave-policies"),
    ])
      .then(([requestResponse, policyResponse]) => {
        setError("");
        setItems(requestResponse.data.data);
        setPages(requestResponse.data.pagination?.pages ?? 1);
        setPoliciesConfigured(
          policyResponse.data.data.some((policy) => policy.isActive),
        );
      })
      .catch((reason) => {
        setItems([]);
        setError(apiError(reason, "Leave requests could not be loaded."));
      });
  };
  useEffect(() => {
    void load();
  }, [approvals, employeeId, page]);
  async function decision(item: LeaveRequest, action: "approve" | "reject") {
    const comment = window.prompt(
      `${action === "approve" ? "Approval" : "Rejection"} comment`,
    );
    if (!comment) return;
    await apiClient
      .post(`/leave-requests/${item.id}/${action}`, { comment })
      .then(load)
      .catch((reason) =>
        setError(apiError(reason, "The leave decision could not be saved.")),
      );
  }
  async function cancel(item: LeaveRequest) {
    if (!window.confirm(tText("Cancel this leave request?"))) return;
    await apiClient
      .post(`/leave-requests/${item.id}/cancel`, {})
      .then(load)
      .catch((reason) =>
        setError(apiError(reason, "The request could not be cancelled.")),
      );
  }
  return (
    <AdminPage
      title={
        approvals
          ? "Leave approvals"
          : employeeId
            ? "Employee Leave history"
            : "Leave requests"
      }
      description={
        approvals
          ? "Approve only employees in your reporting scope; coverage warnings remain advisory."
          : employeeId
            ? "Track this employee's submitted, approved, rejected, and cancelled requests."
            : "Track submitted, approved, rejected, and cancelled requests."
      }
      action={
        returnTo ? (
          <Link className="text-sm font-bold text-foreground" href={returnTo}>
            {tText("Back to employee")}
          </Link>
        ) : undefined
      }
    >
      {error && <ErrorState message={error} />}
      {policiesConfigured === false && canDecide && !error ? (
        <Panel className="p-8 text-center">
          <h2 className="text-xl font-bold">
            {tText("Create your first leave policy")}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-outline">
            {tText(
              "Define leave types and annual entitlement before employees can submit requests. Existing requests, if any, remain preserved.",
            )}
          </p>
          <Link
            className="mt-5 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-bold text-on-tone"
            href="/app/attendance/setup/leave"
          >
            {tText("Set up leave policies")}
          </Link>
        </Panel>
      ) : !items ? (
        <LoadingState />
      ) : (
        <Panel className="overflow-hidden">
          {items.length ? (
            items.map((item) => (
              <div
                className="grid gap-3 border-b border-surface-variant p-5 last:border-0 md:grid-cols-[1fr_190px_100px_190px] md:items-center"
                key={item.id}
              >
                <div>
                  <div className="font-semibold">
                    {canDecide ? item.employee.fullName : item.policy.name}
                  </div>
                  <div className="mt-1 text-xs text-outline">
                    {canDecide ? `${item.policy.name} · ` : ""}
                    {item.reason} · {item.totalDays} {tText("day(s)")}
                  </div>
                </div>
                <div className="text-sm">
                  {dateOnly(item.startDate)} → {dateOnly(item.endDate)}
                </div>
                <StatusPill value={item.status} />
                <div className="flex gap-2">
                  {canDecide && item.status === "PENDING" ? (
                    <>
                      <button
                        className="h-9 flex-1 rounded-lg border border-error text-xs font-semibold text-error"
                        onClick={() => decision(item, "reject")}
                      >
                        {tText("Reject")}
                      </button>
                      <button
                        className="h-9 flex-1 rounded-lg bg-primary text-xs font-semibold text-on-tone"
                        onClick={() => decision(item, "approve")}
                      >
                        {tText("Approve")}
                      </button>
                    </>
                  ) : item.status === "PENDING" && !employeeId ? (
                    <button
                      className="h-9 w-full rounded-lg border border-border text-xs font-semibold"
                      onClick={() => cancel(item)}
                    >
                      {tText("Cancel")}
                    </button>
                  ) : (
                    <span className="text-xs text-outline">
                      {item.managerComments}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title={approvals ? "No approvals waiting" : "No leave requests"}
              body={tText(
                "Requests will appear here with their current decision state.",
              )}
            />
          )}
        </Panel>
      )}
      {pages > 1 && (
        <div className="mt-5 flex items-center justify-end gap-3 text-sm">
          <button
            className="rounded-lg border border-border px-4 py-2 font-semibold disabled:opacity-40"
            disabled={page === 1}
            onClick={() => setPage((current) => current - 1)}
          >
            {tText("Previous")}
          </button>
          <span>
            {tText("Page")}
            {page} {tText("of")}
            {pages}
          </span>
          <button
            className="rounded-lg border border-border px-4 py-2 font-semibold disabled:opacity-40"
            disabled={page >= pages}
            onClick={() => setPage((current) => current + 1)}
          >
            {tText("Next")}
          </button>
        </div>
      )}
    </AdminPage>
  );
}

export function NotificationsInboxView() {
  const { tText } = useTenantLocalization();
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [error, setError] = useState("");
  const load = () =>
    apiClient
      .get("/notifications?page=1&limit=100")
      .then(({ data }) => setItems(data.data))
      .catch(() => setError(tText("Notifications could not be loaded.")));
  useEffect(() => {
    void load();
  }, []);
  async function read(item: InboxItem) {
    if (!item.isRead)
      await apiClient.post(`/notifications/${item.id}/read`, {});
    if (item.actionUrl) window.location.assign(item.actionUrl);
    else load();
  }
  return (
    <AdminPage
      title={tText("Inbox")}
      description={tText(
        "Attendance, leave, approval, sync, and security notices for your account.",
      )}
      action={
        <button
          className="text-sm font-semibold text-foreground"
          onClick={() =>
            apiClient.post("/notifications/read-all", {}).then(load)
          }
        >
          {tText("Mark all read")}
        </button>
      }
    >
      {error && <ErrorState message={error} />}
      {!items ? (
        <LoadingState />
      ) : (
        <Panel className="overflow-hidden">
          {items.length ? (
            items.map((item) => (
              <button
                className={`flex w-full gap-4 border-b border-surface-variant p-5 text-left last:border-0 ${item.isRead ? "bg-card" : "bg-muted"}`}
                key={item.id}
                onClick={() => read(item)}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-container text-on-tone">
                  <Bell className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <strong>{item.title}</strong>
                    <span className="text-xs text-outline">
                      {dateTime(item.createdAt)}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                    {item.body}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <EmptyState
              title={tText("Inbox is clear")}
              body={tText(
                "New transactional and attendance notices will appear here.",
              )}
            />
          )}
        </Panel>
      )}
    </AdminPage>
  );
}

export function LeavePoliciesView() {
  const { tText } = useTenantLocalization();
  const [policies, setPolicies] = useState<LeavePolicy[] | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[] | null>(null);
  const [editing, setEditing] = useState<LeavePolicy | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    leaveType: "ANNUAL",
    annualEntitlement: 20,
    carryForwardLimit: 0,
    isActive: true,
  });
  const load = () =>
    Promise.all([
      apiClient.get<{ data: LeavePolicy[] }>("/leave-policies"),
      apiClient.get<{ data: LeaveBalance[] }>("/leave-balances"),
    ])
      .then(([policyResponse, balanceResponse]) => {
        setPolicies(policyResponse.data.data);
        setBalances(balanceResponse.data.data);
      })
      .catch(() => setError(tText("Leave setup could not be loaded.")));
  useEffect(() => {
    void load();
  }, []);

  function beginEdit(policy: LeavePolicy) {
    setEditing(policy);
    setForm({
      name: policy.name,
      leaveType: policy.leaveType,
      annualEntitlement: Number(policy.accrualLogic?.annualEntitlement ?? 0),
      carryForwardLimit: Number(policy.accrualLogic?.carryForwardLimit ?? 0),
      isActive: policy.isActive,
    });
    setOpen(true);
  }

  async function save() {
    setError("");
    const request = editing
      ? apiClient.patch(`/leave-policies/${editing.id}`, form)
      : apiClient.post("/leave-policies", {
          name: form.name,
          leaveType: form.leaveType,
          annualEntitlement: form.annualEntitlement,
          carryForwardLimit: form.carryForwardLimit,
        });
    await request
      .then(async () => {
        setOpen(false);
        setEditing(null);
        await load();
      })
      .catch((reason) =>
        setError(apiError(reason, "The leave policy could not be saved.")),
      );
  }

  async function adjustBalance(balance: LeaveBalance) {
    const rawDays = window.prompt(
      `Add or subtract days for ${balance.employee?.fullName ?? "this employee"}. Use a negative number to subtract.`,
      "1",
    );
    if (rawDays === null) return;
    const days = Number(rawDays);
    if (!Number.isFinite(days) || days === 0) {
      setError(tText("Enter a non-zero number of days."));
      return;
    }
    const reason = window.prompt("Reason for this balance adjustment");
    if (!reason || reason.trim().length < 3) return;
    await apiClient
      .post(`/leave-balances/${balance.id}/adjust`, { days, reason })
      .then(load)
      .catch((requestError) =>
        setError(apiError(requestError, "The balance could not be adjusted.")),
      );
  }

  return (
    <AdminPage
      action={
        <PrimaryButton
          onClick={() => {
            setEditing(null);
            setForm({
              name: "",
              leaveType: "ANNUAL",
              annualEntitlement: 20,
              carryForwardLimit: 0,
              isActive: true,
            });
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> {tText("Create policy")}
        </PrimaryButton>
      }
      description={tText(
        "Define leave types for all active employees and manage their balances.",
      )}
      title={tText("Leave policies")}
    >
      {error && <ErrorState message={error} />}
      <Panel className="mb-5 p-5">
        <h2 className="font-bold">{tText("How Leave policies apply")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {tText(
            "A new policy creates an opening balance for every active employee. New employees receive the same active policies automatically. Policy changes keep existing requests and balance ledger entries intact.",
          )}
        </p>
      </Panel>
      {!policies ? (
        <LoadingState />
      ) : policies.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {policies.map((policy) => (
            <Panel className="p-6" key={policy.id}>
              <div className="flex items-start justify-between gap-3">
                <CalendarCheck className="size-6 text-foreground" />
                <StatusPill value={policy.isActive ? "ACTIVE" : "INACTIVE"} />
              </div>
              <h2 className="mt-5 text-lg font-bold">{policy.name}</h2>
              <p className="mt-1 text-sm text-outline">
                {policy.leaveType.replaceAll("_", " ")} {tText("· version")}{" "}
                {policy.version ?? 1}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted p-3">
                  <span className="text-xs text-outline">
                    {tText("Annual")}
                  </span>
                  <strong className="mt-1 block">
                    {policy.accrualLogic?.annualEntitlement ?? 0}{" "}
                    {tText("days")}
                  </strong>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <span className="text-xs text-outline">
                    {tText("Carry forward")}
                  </span>
                  <strong className="mt-1 block">
                    {policy.accrualLogic?.carryForwardLimit ?? 0}{" "}
                    {tText("days")}
                  </strong>
                </div>
              </div>
              <button
                className="mt-5 text-sm font-bold text-foreground"
                onClick={() => beginEdit(policy)}
                type="button"
              >
                {tText("Edit policy")}
              </button>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel>
          <EmptyState
            body={tText(
              "Create the first policy before employees submit leave requests.",
            )}
            title={tText("No Leave policies")}
          />
        </Panel>
      )}
      <Panel className="mt-5 overflow-hidden">
        <div className="border-b border-surface-variant p-5">
          <h2 className="font-bold">{tText("Employee balances")}</h2>
          <p className="mt-1 text-sm text-outline">
            {tText(
              "Make a manual correction only when HR needs to add or subtract entitlement.",
            )}
          </p>
        </div>
        {!balances ? (
          <LoadingState />
        ) : balances.length ? (
          balances.map((balance) => (
            <div
              className="grid gap-3 border-b border-surface-variant p-5 last:border-0 md:grid-cols-[1fr_1fr_120px_110px] md:items-center"
              key={balance.id}
            >
              <div>
                <strong>
                  {balance.employee?.fullName ?? tText("Employee")}
                </strong>
                <div className="text-xs text-outline">
                  {balance.employee?.employeeCode}
                </div>
              </div>
              <span className="text-sm">{balance.policy.name}</span>
              <strong>
                {Number(balance.remainingDays)} {tText("days")}
              </strong>
              <button
                className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground"
                onClick={() => adjustBalance(balance)}
                type="button"
              >
                {tText("Adjust")}
              </button>
            </div>
          ))
        ) : (
          <EmptyState
            body={tText(
              "Balances are created when an active policy and employee exist.",
            )}
            title={tText("No employee balances")}
          />
        )}
      </Panel>
      {open && (
        <Modal
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          title={editing ? "Edit Leave policy" : "Create Leave policy"}
        >
          <div className="grid gap-4">
            <Field label={tText("Policy name")}>
              <input
                className={inputClass}
                minLength={2}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                value={form.name}
              />
            </Field>
            <Field label={tText("Leave type")}>
              <input
                className={inputClass}
                minLength={2}
                onChange={(event) =>
                  setForm({ ...form, leaveType: event.target.value })
                }
                value={form.leaveType}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={tText("Annual entitlement")}>
                <input
                  className={inputClass}
                  max={366}
                  min={0}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      annualEntitlement: Number(event.target.value),
                    })
                  }
                  type="number"
                  value={form.annualEntitlement}
                />
              </Field>
              <Field label={tText("Carry-forward limit")}>
                <input
                  className={inputClass}
                  max={366}
                  min={0}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      carryForwardLimit: Number(event.target.value),
                    })
                  }
                  type="number"
                  value={form.carryForwardLimit}
                />
              </Field>
            </div>
            {editing && (
              <CheckField
                checked={form.isActive}
                label={tText("Allow new requests under this policy")}
                onChange={(isActive) => setForm({ ...form, isActive })}
              />
            )}
            <PrimaryButton
              disabled={
                form.name.trim().length < 2 || form.leaveType.trim().length < 2
              }
              onClick={save}
            >
              {editing ? tText("Save next version") : tText("Create policy")}
            </PrimaryButton>
          </div>
        </Modal>
      )}
    </AdminPage>
  );
}

export function LeaveModuleHub() {
  const { tText } = useTenantLocalization();
  const permissions = new Set(
    useAuthStore((state) => state.user?.permissions ?? []),
  );
  const links = [
    {
      title: tText("My balances"),
      body: tText("Review entitlement and apply for leave."),
      href: "/app/attendance/leave/balances",
      show: permissions.has("leave.self"),
    },
    {
      title: tText("My requests"),
      body: tText("Track every leave decision and cancellation."),
      href: "/app/attendance/leave/requests",
      show: permissions.has("leave.self"),
    },
    {
      title: tText("Approval queue"),
      body: tText("Review reporting-line requests and coverage warnings."),
      href: "/app/attendance/leave/approvals",
      show: permissions.has("leave.approve") || permissions.has("leave.manage"),
    },
    {
      title: tText("Policies and configuration"),
      body: tText(
        "Manage entitlement, carry-forward, versions, and request availability.",
      ),
      href: "/app/attendance/setup/leave",
      show: permissions.has("leave.manage"),
    },
  ];
  return (
    <AdminPage
      title={tText("Leave management")}
      description={tText(
        "Leave policies, balances, requests, and approvals inside Attendance.",
      )}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {links
          .filter((item) => item.show)
          .map((item) => (
            <Link
              className="group rounded-xl border border-surface-variant bg-card p-6 shadow-sm transition hover:border-primary"
              href={item.href}
              key={item.href}
            >
              <CalendarCheck className="size-6 text-foreground" />
              <h2 className="mt-5 text-lg font-bold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.body}
              </p>
            </Link>
          ))}
      </div>
    </AdminPage>
  );
}

function StatusPill({ value }: { value: string }) {
  const { tText } = useTenantLocalization();
  const tone =
    value === "APPROVED" || value === "COMPLETED" || value === "LOCKED"
      ? "success"
    : value === "REJECTED" || value === "FAILED"
        ? "danger"
    : value === "PENDING" || value === "RUNNING"
          ? "warning"
          : "neutral";
  return (
    <StatusBadge tone={tone}>
      {reportStatusLabel(value, tText)}
    </StatusBadge>
  );
}
function Comparison({
  label,
  current,
  requested,
}: {
  label: string;
  current: string;
  requested: string;
}) {
  return (
    <div className="grid grid-cols-3 border-b border-surface-variant px-5 py-4 text-sm last:border-0">
      <strong>{label}</strong>
      <span>{current}</span>
      <span className="font-semibold text-foreground">{requested}</span>
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { tText } = useTenantLocalization();
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-foreground/45 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-2xl bg-card p-7 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button aria-label={tText("Close")} onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-lg bg-muted p-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
function reportEndpoint(type: ReportJob["reportType"]) {
  return (
    {
      MUSTER: "/reports/muster",
      PAYROLL: "/reports/payroll-export",
      LATE_OT: "/reports/late-ot",
      VIOLATIONS: "/reports/violations",
      FIELD_DISTANCE: "/reports/field-distance",
    } as const
  )[type];
}
function reportLabel(
  type: ReportJob["reportType"],
  contractVersion: number | undefined,
  tText: (message: string) => string,
) {
  if (
    type === "MUSTER" &&
    contractVersion !== undefined &&
    contractVersion < 3
  ) {
    return tText("Attendance export (legacy single sheet)");
  }
  if (type === "MUSTER") return tText("Detailed attendance");
  if (type === "PAYROLL") return tText("Payroll attendance");
  if (type === "LATE_OT") return tText("Late and overtime");
  if (type === "VIOLATIONS") return tText("Attendance violations");
  return tText("Field distance");
}

function reportStatusLabel(value: string, tText: (message: string) => string) {
  if (value === "ALL") return tText("All");
  if (value === "PENDING") return tText("Pending");
  if (value === "RUNNING") return tText("Running");
  if (value === "COMPLETED") return tText("Completed");
  if (value === "FAILED") return tText("Failed");
  if (value === "APPROVED") return tText("Approved");
  if (value === "REJECTED") return tText("Rejected");
  if (value === "LOCKED") return tText("Locked");
  if (value === "EXPIRED") return tText("Expired");
  return value.replaceAll("_", " ");
}
function dateOnly(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function dateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function time(value?: string | null) {
  return value
    ? new Date(value).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not recorded";
}
function age(value: string) {
  const hours = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000),
  );
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
function apiError(reason: unknown, fallback: string) {
  if (!reason || typeof reason !== "object" || !("response" in reason))
    return fallback;
  const response = (reason as { response?: { data?: { message?: unknown } } })
    .response;
  return typeof response?.data?.message === "string"
    ? response.data.message
    : fallback;
}

"use client";

import {
  Bell,
  CalendarCheck,
  Check,
  Download,
  FileSpreadsheet,
  LockKeyhole,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
  useParams,
} from "next/navigation";
import { useEffect, useState } from "react";
import { FeatureInfo } from "@/components/help/feature-info";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import {
  AdminPage,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Panel,
  PrimaryButton,
  inputClass,
} from "./page-primitives";

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
  checksum?: string | null;
  failureMessage?: string | null;
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
  // Status is the only reactive input; load is also reused after mutations.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void load();
  }, [status]);
  return (
    <AdminPage
      title="Attendance corrections"
      description="Review correction requests by age, evidence, and reporting scope."
      action={
        <select
          aria-label="Request status"
          className={inputClass}
          value={status}
          onChange={(event) => {
            const nextStatus = requestStatus(event.target.value);
            router.push(`${pathname}?status=${nextStatus}`, { scroll: false });
          }}
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
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
                className="grid gap-3 border-b border-[#e4e1ee] p-5 transition last:border-0 hover:bg-[#f8f5ff] md:grid-cols-[1fr_170px_130px_110px] md:items-center"
                href={`/app/attendance/regularizations/${item.id}?returnTo=${encodeURIComponent(`${pathname}?status=${status}`)}`}
                key={item.id}
              >
                <div>
                  <div className="font-semibold">{item.employee.fullName}</div>
                  <div className="mt-1 text-xs text-[#777587]">
                    {item.employee.employeeCode} · {item.reason}
                  </div>
                </div>
                <div className="text-sm">
                  <span className="block text-xs text-[#777587]">
                    Attendance date
                  </span>
                  {dateOnly(item.attendanceLog.attendanceDate)}
                </div>
                <div className="text-sm">
                  <span className="block text-xs text-[#777587]">Waiting</span>
                  {age(item.createdAt)}
                </div>
                <StatusPill value={item.status} />
              </Link>
            ))
          ) : (
            <EmptyState
              title="Queue is clear"
              body="There are no correction requests in this state."
            />
          )}
        </Panel>
      )}
    </AdminPage>
  );
}

export function RegularizationDetailView({ returnTo }: { returnTo: string }) {
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
        setError("This request is unavailable or outside your scope."),
      );
  // The route id is the only reactive input; load is also reused after decisions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void load();
  }, [id]);
  async function decide(action: "approve" | "reject") {
    if (!comment.trim())
      return setError("Add a decision comment before continuing.");
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
        title="Correction request"
        description="Loading request evidence and recompute preview."
      >
        <LoadingState />
      </AdminPage>
    );
  return (
    <AdminPage
      title="Correction decision"
      description="Compare immutable attendance evidence with the requested correction."
      action={
        <Link className="text-sm font-semibold text-[#3525cd]" href={returnTo}>
          Back to queue
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
                  <p className="text-sm text-[#777587]">
                    {item.employee.employeeCode} ·{" "}
                    {dateOnly(item.attendanceLog.attendanceDate)}
                  </p>
                </div>
                <StatusPill value={item.status} />
              </div>
              <p className="mt-5 rounded-xl bg-[#f5f2ff] p-4 text-sm leading-6">
                {item.reason}
              </p>
            </Panel>
            <Panel className="overflow-hidden">
              <div className="grid grid-cols-3 bg-[#302f39] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white">
                <span>Evidence</span>
                <span>Recorded</span>
                <span>Requested</span>
              </div>
              <Comparison
                label="Check-in"
                current={time(item.attendanceLog.firstCheckin)}
                requested={time(item.requestedCheckin)}
              />
              <Comparison
                label="Checkout"
                current={time(item.attendanceLog.lastCheckout)}
                requested={time(item.requestedCheckout)}
              />
              <Comparison
                label="Result"
                current={item.attendanceLog.attendanceStatus}
                requested="Recompute on approval"
              />
            </Panel>
          </div>
          <Panel className="h-fit p-6">
            <h2 className="font-bold">Decision</h2>
            {item.status === "PENDING" ? (
              <>
                <Field label="Audit comment">
                  <textarea
                    className={`${inputClass} mt-4 h-28 py-3`}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                  />
                </Field>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    className="h-11 rounded-xl border border-[#ba1a1a] font-semibold text-[#ba1a1a]"
                    disabled={busy}
                    onClick={() => decide("reject")}
                  >
                    <X className="mr-2 inline size-4" />
                    Reject
                  </button>
                  <PrimaryButton
                    disabled={busy}
                    onClick={() => decide("approve")}
                  >
                    <Check className="size-4" />
                    Approve
                  </PrimaryButton>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-[#5e5b68]">
                {item.managerComments || "Decision completed."}
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
  const load = () =>
    apiClient
      .get("/reports?page=1&limit=100")
      .then(({ data }) => setJobs(data.data))
      .catch(() => setError("Report jobs could not be loaded."));
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
        format: "CSV",
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
      title="Reports center"
      description="Generate reproducible attendance exports and keep their snapshot evidence."
      action={
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Report type"
            className={inputClass}
            value={type}
            onChange={(event) =>
              setType(event.target.value as ReportJob["reportType"])
            }
          >
            {reportTypes.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <input
            aria-label="Report period"
            className={inputClass}
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          />
          {canGenerate && (
            <PrimaryButton disabled={busy} onClick={() => create()}>
              <Plus className="size-4" />
              Generate
            </PrimaryButton>
          )}
        </div>
      }
    >
      {error && <ErrorState message={error} />}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          Job status
          <select
            className={inputClass}
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
          >
            {["ALL", "PENDING", "RUNNING", "COMPLETED", "FAILED"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
        <p className="text-xs text-[#777587]">
          Jobs refresh automatically. Failed jobs can be generated again with
          the same period.
        </p>
      </div>
      {!jobs ? (
        <LoadingState />
      ) : (
        <Panel className="overflow-hidden">
          {visibleJobs?.length ? (
            visibleJobs.map((job) => {
              const expired =
                job.status === "COMPLETED" &&
                job.expiresAt &&
                new Date(job.expiresAt) <= new Date();
              return (
                <div
                  className="grid gap-3 border-b border-[#e4e1ee] p-5 last:border-0 md:grid-cols-[1fr_140px_140px_150px] md:items-center"
                  key={job.id}
                >
                  <div>
                    <div className="flex items-center gap-2 font-semibold">
                      <FileSpreadsheet className="size-4 text-[#3525cd]" />
                      {job.reportType.replaceAll("_", " ")}
                    </div>
                    <div className="mt-1 text-xs text-[#777587]">
                      {job.period} · contract v1{" "}
                      {job.checksum ? `· ${job.checksum.slice(0, 12)}…` : ""}
                    </div>
                    {job.failureMessage && (
                      <div className="mt-1 text-xs text-[#93000a]">
                        {job.failureMessage}
                      </div>
                    )}
                  </div>
                  <span className="text-sm">{dateTime(job.createdAt)}</span>
                  <StatusPill value={expired ? "EXPIRED" : job.status} />
                  {job.status === "FAILED" && canGenerate ? (
                    <button
                      className="h-10 rounded-lg border border-[#c7c4d8] text-sm font-semibold text-[#3525cd]"
                      disabled={busy}
                      onClick={() => create(job.reportType, job.period)}
                    >
                      <RotateCcw className="mr-2 inline size-4" />
                      Generate again
                    </button>
                  ) : (
                    <button
                      className="h-10 rounded-lg border border-[#c7c4d8] text-sm font-semibold text-[#3525cd] disabled:opacity-40"
                      disabled={job.status !== "COMPLETED" || Boolean(expired)}
                      onClick={() => download(job.id)}
                    >
                      <Download className="mr-2 inline size-4" />
                      {expired ? "Expired" : "Download"}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <EmptyState
              title="No report jobs"
              body={
                status === "ALL"
                  ? "Generate an Attendance export to create the first report job."
                  : `No ${status.toLowerCase()} report jobs match this filter.`
              }
            />
          )}
        </Panel>
      )}
      <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold text-[#3525cd]">
        <Link href="/app/attendance/register">Open Attendance register</Link>
        {moduleKeys.has("PAYROLL") && (
          <Link href="/app/modules/payroll">Review payroll locks</Link>
        )}
      </div>
    </AdminPage>
  );
}

export function PayrollLockView() {
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
      .catch(() => setError("Payroll lock data could not be loaded."));
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
      title="Payroll close"
      description="Lock a finalized month against a completed payroll export, with an immutable reopen trail."
      action={
        <Link
          className="text-sm font-semibold text-[#3525cd]"
          href="/app/attendance/reports"
        >
          Open reports center
        </Link>
      }
    >
      {error && <ErrorState message={error} />}
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Panel className="h-fit p-6">
          <div className="grid size-11 place-items-center rounded-xl bg-[#302f39] text-white">
            <LockKeyhole className="size-5" />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <h2 className="text-lg font-bold">Close a payroll month</h2>
            <FeatureInfo helpKey="payroll-lock" />
          </div>
          <div className="mt-4 rounded-xl border border-[#f2d29e] bg-[#fff9ed] p-4 text-sm leading-6 text-[#6d4600]">
            Locking freezes attendance, corrections, OD/WFH changes, and leave
            integration for the selected period. Confirm the completed payroll
            export and affected month before continuing.
          </div>
          <div className="mt-5 grid gap-4">
            <Field label="Period">
              <input
                className={inputClass}
                type="month"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              />
            </Field>
            <Field label="Completed payroll export">
              <select
                className={inputClass}
                value={exportId}
                onChange={(event) => setExportId(event.target.value)}
              >
                <option value="">Select export</option>
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
              Lock month
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
                  className="border-b border-[#e4e1ee] p-5 last:border-0"
                  key={item.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xl font-bold">{item.period}</div>
                      <div className="mt-1 text-xs text-[#777587]">
                        Export {item.export?.id.slice(0, 8)} ·{" "}
                        {item.export?.checksum?.slice(0, 12)}…
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusPill value={item.status} />
                      {item.status === "LOCKED" && (
                        <button
                          className="h-9 rounded-lg border border-[#c7c4d8] px-3 text-sm font-semibold"
                          onClick={() => reopen(item)}
                        >
                          <RotateCcw className="mr-1 inline size-4" />
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.history.map((entry) => (
                      <span
                        className="rounded-lg bg-[#f5f2ff] px-3 py-2 text-xs"
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
                title="No closed periods"
                body="Generate a payroll export before locking the first month."
              />
            )}
          </Panel>
        )}
      </div>
    </AdminPage>
  );
}

export function LeaveBalancesView() {
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
      .catch(() => setError("Leave balances could not be loaded."));
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
      title="My leave"
      description="Review available entitlement and request full or half-day leave."
      action={
        <PrimaryButton onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Apply for leave
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
              <div className="grid size-11 place-items-center rounded-xl bg-[#e2dfff] text-[#3525cd]">
                <CalendarCheck />
              </div>
              <div className="mt-5 text-sm text-[#777587]">
                {balance.policy.name}
              </div>
              <div className="mt-1 text-4xl font-bold">
                {Number(balance.remainingDays)}
                <span className="ml-2 text-base font-medium text-[#777587]">
                  days
                </span>
              </div>
            </Panel>
          ))}
        </div>
      )}
      {open && (
        <Modal title="Apply for leave" onClose={() => setOpen(false)}>
          <div className="grid gap-4">
            <Field label="Leave type">
              <select
                className={inputClass}
                value={form.policyId}
                onChange={(event) =>
                  setForm({ ...form, policyId: event.target.value })
                }
              >
                <option value="">Select policy</option>
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
              <Field label="Starts">
                <input
                  className={inputClass}
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm({ ...form, startDate: event.target.value })
                  }
                />
              </Field>
              <Field label="Ends">
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
                label="Half-day start"
                checked={form.halfDayStart}
                onChange={(checked) =>
                  setForm({ ...form, halfDayStart: checked })
                }
              />
              <CheckField
                label="Half-day end"
                checked={form.halfDayEnd}
                onChange={(checked) =>
                  setForm({ ...form, halfDayEnd: checked })
                }
              />
            </div>
            <Field label="Reason">
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
              Submit request
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
  // Query inputs identify the exact scoped queue; load is reused after decisions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!window.confirm("Cancel this leave request?")) return;
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
          <Link className="text-sm font-bold text-[#3525cd]" href={returnTo}>
            Back to employee
          </Link>
        ) : undefined
      }
    >
      {error && <ErrorState message={error} />}
      {policiesConfigured === false && canDecide && !error ? (
        <Panel className="p-8 text-center">
          <h2 className="text-xl font-bold">Create your first leave policy</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#777587]">
            Define leave types and annual entitlement before employees can
            submit requests. Existing requests, if any, remain preserved.
          </p>
          <Link
            className="mt-5 inline-flex h-11 items-center rounded-xl bg-[#3525cd] px-5 text-sm font-bold text-white"
            href="/app/attendance/setup/leave"
          >
            Set up leave policies
          </Link>
        </Panel>
      ) : !items ? (
        <LoadingState />
      ) : (
        <Panel className="overflow-hidden">
          {items.length ? (
            items.map((item) => (
              <div
                className="grid gap-3 border-b border-[#e4e1ee] p-5 last:border-0 md:grid-cols-[1fr_190px_100px_190px] md:items-center"
                key={item.id}
              >
                <div>
                  <div className="font-semibold">
                    {canDecide ? item.employee.fullName : item.policy.name}
                  </div>
                  <div className="mt-1 text-xs text-[#777587]">
                    {canDecide ? `${item.policy.name} · ` : ""}
                    {item.reason} · {item.totalDays} day(s)
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
                        className="h-9 flex-1 rounded-lg border border-[#ba1a1a] text-xs font-semibold text-[#ba1a1a]"
                        onClick={() => decision(item, "reject")}
                      >
                        Reject
                      </button>
                      <button
                        className="h-9 flex-1 rounded-lg bg-[#3525cd] text-xs font-semibold text-white"
                        onClick={() => decision(item, "approve")}
                      >
                        Approve
                      </button>
                    </>
                  ) : item.status === "PENDING" && !employeeId ? (
                    <button
                      className="h-9 w-full rounded-lg border border-[#c7c4d8] text-xs font-semibold"
                      onClick={() => cancel(item)}
                    >
                      Cancel
                    </button>
                  ) : (
                    <span className="text-xs text-[#777587]">
                      {item.managerComments}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title={approvals ? "No approvals waiting" : "No leave requests"}
              body="Requests will appear here with their current decision state."
            />
          )}
        </Panel>
      )}
      {pages > 1 && (
        <div className="mt-5 flex items-center justify-end gap-3 text-sm">
          <button
            className="rounded-lg border border-[#c7c4d8] px-4 py-2 font-semibold disabled:opacity-40"
            disabled={page === 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            className="rounded-lg border border-[#c7c4d8] px-4 py-2 font-semibold disabled:opacity-40"
            disabled={page >= pages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      )}
    </AdminPage>
  );
}

export function NotificationsInboxView() {
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [error, setError] = useState("");
  const load = () =>
    apiClient
      .get("/notifications?page=1&limit=100")
      .then(({ data }) => setItems(data.data))
      .catch(() => setError("Notifications could not be loaded."));
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
      title="Inbox"
      description="Attendance, leave, approval, sync, and security notices for your account."
      action={
        <button
          className="text-sm font-semibold text-[#3525cd]"
          onClick={() =>
            apiClient.post("/notifications/read-all", {}).then(load)
          }
        >
          Mark all read
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
                className={`flex w-full gap-4 border-b border-[#e4e1ee] p-5 text-left last:border-0 ${item.isRead ? "bg-white" : "bg-[#f5f2ff]"}`}
                key={item.id}
                onClick={() => read(item)}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#302f39] text-white">
                  <Bell className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <strong>{item.title}</strong>
                    <span className="text-xs text-[#777587]">
                      {dateTime(item.createdAt)}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-[#5e5b68]">
                    {item.body}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <EmptyState
              title="Inbox is clear"
              body="New transactional and attendance notices will appear here."
            />
          )}
        </Panel>
      )}
    </AdminPage>
  );
}

export function LeavePoliciesView() {
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
      .catch(() => setError("Leave setup could not be loaded."));
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
      setError("Enter a non-zero number of days.");
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
          <Plus className="size-4" /> Create policy
        </PrimaryButton>
      }
      description="Define leave types for all active employees and manage their balances."
      title="Leave policies"
    >
      {error && <ErrorState message={error} />}
      <Panel className="mb-5 p-5">
        <h2 className="font-bold">How Leave policies apply</h2>
        <p className="mt-2 text-sm leading-6 text-[#646171]">
          A new policy creates an opening balance for every active employee.
          New employees receive the same active policies automatically. Policy
          changes keep existing requests and balance ledger entries intact.
        </p>
      </Panel>
      {!policies ? (
        <LoadingState />
      ) : policies.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {policies.map((policy) => (
            <Panel className="p-6" key={policy.id}>
              <div className="flex items-start justify-between gap-3">
                <CalendarCheck className="size-6 text-[#3525cd]" />
                <StatusPill value={policy.isActive ? "ACTIVE" : "INACTIVE"} />
              </div>
              <h2 className="mt-5 text-lg font-bold">{policy.name}</h2>
              <p className="mt-1 text-sm text-[#777587]">
                {policy.leaveType.replaceAll("_", " ")} · version{" "}
                {policy.version ?? 1}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#f5f2ff] p-3">
                  <span className="text-xs text-[#777587]">Annual</span>
                  <strong className="mt-1 block">
                    {policy.accrualLogic?.annualEntitlement ?? 0} days
                  </strong>
                </div>
                <div className="rounded-xl bg-[#f5f2ff] p-3">
                  <span className="text-xs text-[#777587]">Carry forward</span>
                  <strong className="mt-1 block">
                    {policy.accrualLogic?.carryForwardLimit ?? 0} days
                  </strong>
                </div>
              </div>
              <button
                className="mt-5 text-sm font-bold text-[#3525cd]"
                onClick={() => beginEdit(policy)}
                type="button"
              >
                Edit policy
              </button>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel>
          <EmptyState
            body="Create the first policy before employees submit leave requests."
            title="No Leave policies"
          />
        </Panel>
      )}
      <Panel className="mt-5 overflow-hidden">
        <div className="border-b border-[#e4e1ee] p-5">
          <h2 className="font-bold">Employee balances</h2>
          <p className="mt-1 text-sm text-[#777587]">
            Make a manual correction only when HR needs to add or subtract
            entitlement.
          </p>
        </div>
        {!balances ? (
          <LoadingState />
        ) : balances.length ? (
          balances.map((balance) => (
            <div
              className="grid gap-3 border-b border-[#e4e1ee] p-5 last:border-0 md:grid-cols-[1fr_1fr_120px_110px] md:items-center"
              key={balance.id}
            >
              <div>
                <strong>{balance.employee?.fullName ?? "Employee"}</strong>
                <div className="text-xs text-[#777587]">
                  {balance.employee?.employeeCode}
                </div>
              </div>
              <span className="text-sm">{balance.policy.name}</span>
              <strong>{Number(balance.remainingDays)} days</strong>
              <button
                className="rounded-lg border border-[#c7c4d8] px-3 py-2 text-sm font-semibold text-[#3525cd]"
                onClick={() => adjustBalance(balance)}
                type="button"
              >
                Adjust
              </button>
            </div>
          ))
        ) : (
          <EmptyState
            body="Balances are created when an active policy and employee exist."
            title="No employee balances"
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
            <Field label="Policy name">
              <input
                className={inputClass}
                minLength={2}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                value={form.name}
              />
            </Field>
            <Field label="Leave type">
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
              <Field label="Annual entitlement">
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
              <Field label="Carry-forward limit">
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
                label="Allow new requests under this policy"
                onChange={(isActive) => setForm({ ...form, isActive })}
              />
            )}
            <PrimaryButton
              disabled={
                form.name.trim().length < 2 || form.leaveType.trim().length < 2
              }
              onClick={save}
            >
              {editing ? "Save next version" : "Create policy"}
            </PrimaryButton>
          </div>
        </Modal>
      )}
    </AdminPage>
  );
}

export function LeaveModuleHub() {
  const permissions = new Set(
    useAuthStore((state) => state.user?.permissions ?? []),
  );
  const links = [
    {
      title: "My balances",
      body: "Review entitlement and apply for leave.",
      href: "/app/attendance/leave/balances",
      show: permissions.has("leave.self"),
    },
    {
      title: "My requests",
      body: "Track every leave decision and cancellation.",
      href: "/app/attendance/leave/requests",
      show: permissions.has("leave.self"),
    },
    {
      title: "Approval queue",
      body: "Review reporting-line requests and coverage warnings.",
      href: "/app/attendance/leave/approvals",
      show: permissions.has("leave.approve") || permissions.has("leave.manage"),
    },
    {
      title: "Policies and configuration",
      body: "Manage entitlement, carry-forward, versions, and request availability.",
      href: "/app/attendance/setup/leave",
      show: permissions.has("leave.manage"),
    },
  ];
  return (
    <AdminPage
      title="Leave management"
      description="Leave policies, balances, requests, and approvals inside Attendance."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {links
          .filter((item) => item.show)
          .map((item) => (
            <Link
              className="group rounded-xl border border-[#e4e1ee] bg-white p-6 shadow-sm transition hover:border-[#3525cd]"
              href={item.href}
              key={item.href}
            >
              <CalendarCheck className="size-6 text-[#3525cd]" />
              <h2 className="mt-5 text-lg font-bold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5e5b68]">
                {item.body}
              </p>
            </Link>
          ))}
      </div>
    </AdminPage>
  );
}

function StatusPill({ value }: { value: string }) {
  const tone =
    value === "APPROVED" || value === "COMPLETED" || value === "LOCKED"
      ? "bg-[#d8f8df] text-[#005320]"
      : value === "REJECTED" || value === "FAILED"
        ? "bg-[#ffdad6] text-[#93000a]"
        : value === "PENDING" || value === "RUNNING"
          ? "bg-[#fff1c2] text-[#604100]"
          : "bg-[#f0ecf9] text-[#464555]";
  return (
    <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${tone}`}>
      {value.replaceAll("_", " ")}
    </span>
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
    <div className="grid grid-cols-3 border-b border-[#e4e1ee] px-5 py-4 text-sm last:border-0">
      <strong>{label}</strong>
      <span>{current}</span>
      <span className="font-semibold text-[#3525cd]">{requested}</span>
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
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#1b1b24]/45 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-7 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button aria-label="Close" onClick={onClose}>
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
    <label className="flex items-center gap-3 rounded-lg bg-[#f5f2ff] p-3 text-sm">
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

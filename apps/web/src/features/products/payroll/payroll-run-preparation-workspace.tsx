"use client";

import {
  CheckCircle2,
  FileOutput,
  PlayCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  WalletCards,
  Loader2,
  ArrowRight,
  Plus,
  Trash2,
  Download,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Link } from "@/i18n/navigation";
import { useTenantLocalization } from "@/lib/tenant-localization";
import {
  AdminPage,
  ErrorState,
  Field,
  LoadingState,
  Panel,
  PrimaryButton,
  inputClass,
} from "@/shared/components/page-primitives";

const today = new Date().toISOString().slice(0, 10);

const STATUS_STEPS = [
  "DRAFT",
  "VALIDATING",
  "INPUTS_READY",
  "CALCULATED",
  "REVIEWED",
  "APPROVED",
  "FINALIZED",
  "OUTPUTS_GENERATED",
  "PUBLISHED",
  "PAID",
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "theme-tone theme-tone-neutral",
  VALIDATING: "theme-tone theme-tone-amber",
  INPUTS_READY: "theme-tone theme-tone-neutral",
  CALCULATING: "theme-tone theme-tone-violet",
  CALCULATED: "theme-tone theme-tone-violet",
  REVIEWED: "theme-tone theme-tone-teal",
  APPROVED: "theme-tone theme-tone-emerald",
  FINALIZED: "theme-tone theme-tone-emerald",
  OUTPUTS_GENERATED: "theme-tone theme-tone-blue",
  PUBLISHED: "theme-tone theme-tone-teal",
  PAID: "theme-tone theme-tone-emerald",
  CANCELLED: "theme-tone theme-tone-red",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Add attendance and salary changes",
  VALIDATING: "Checking payroll",
  INPUTS_READY: "Ready to calculate",
  CALCULATING: "Calculating salary",
  CALCULATED: "Ready for review",
  REVIEWED: "Ready for approval",
  APPROVED: "Ready to finalize",
  FINALIZED: "Ready to generate payslips",
  OUTPUTS_GENERATED: "Payslips and files ready",
  PUBLISHED: "Payslips published",
  PAID: "Salary paid",
};

type BulkSalaryChangeRow = {
  amount: string;
  code: string;
  currency: string;
  employeeId: string;
  id: string;
  kind: string;
  reason: string;
};

export function PayrollRunPreparationWorkspace({
  initialEmployeeId = "",
}: {
  initialEmployeeId?: string;
} = {}) {
  const { tText } = useTenantLocalization();
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [activeRunId, setActiveRunId] = useState("");
  const [activeRunPayGroupId, setActiveRunPayGroupId] = useState("");
  const [activeRunStatus, setActiveRunStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/payroll/runs");
      const list = rows(response.data);
      setRuns(list);
      if (activeRunId) {
        const current = list.find((r) => r.id === activeRunId);
        if (current) {
          setActiveRunStatus(String(current.status ?? ""));
          setActiveRunPayGroupId(String(current.payGroupId ?? ""));
        }
      }
    } catch (refreshError) {
      setError(apiError(refreshError));
    } finally {
      setLoading(false);
    }
  }, [activeRunId]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const currentStepIndex = STATUS_STEPS.indexOf(activeRunStatus);
  const completedCount = currentStepIndex >= 0 ? currentStepIndex : 0;

  return (
    <AdminPage
      title={tText("Run payroll")}
      description={tText("Create salary for a pay group, check it, approve it, then generate payslips and payment files.")}
      action={
        <PrimaryButton onClick={refresh}>
          <RefreshCw className="size-4" />
          {tText("Refresh")}
        </PrimaryButton>
      }
    >
      <div className="grid gap-5">
        {error && <ErrorState message={error} />}
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
          <CreateRunForm
            onCreated={(id, payGroupId) => {
              setActiveRunId(id);
              setActiveRunPayGroupId(payGroupId);
              setActiveRunStatus("DRAFT");
              void refresh();
            }}
          />
          <Panel className="p-5">
            <h2 className="text-base font-semibold">{tText("Progress")}</h2>
            {activeRunId && activeRunStatus ? (
              <div className="mt-4 flex flex-wrap gap-1">
                {STATUS_STEPS.map((step, index) => {
                  const isCurrent = step === activeRunStatus;
                  const isDone = index < completedCount;
                  return (
                    <div key={step} className="flex items-center gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          isCurrent
                            ? "bg-primary text-on-tone ring-2 ring-ring/30"
                            : isDone
                                ? "theme-tone theme-tone-emerald"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {tText(step.replace(/_/g, " "))}
                      </span>
                      {index < STATUS_STEPS.length - 1 && (
                        <ArrowRight className="size-3 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {tText("Create payroll or select a run to see progress.")}
              </p>
            )}
          </Panel>
        </div>
        <Panel className="overflow-hidden">
            <div className="border-b border-outline-variant p-5">
            <div className="flex items-center gap-3">
              <PlayCircle className="size-5 text-foreground" />
              <h2 className="text-lg font-semibold">{tText("Runs")}</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {tText("Select a payroll month, then complete the work steps below.")}
            </p>
          </div>
          {loading ? (
            <div className="p-5">
              <LoadingState />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-outline-variant text-sm">
                <thead className="theme-table-header text-left text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    {[
                      "Period",
                      "Pay group",
                      "Status",
                      "Source",
                      "Issues",
                      "Actions",
                    ].map((item) => (
                      <th className="px-4 py-3" key={item}>
                        {tText(item)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant bg-card">
                  {runs.map((run) => {
                    const isSelected = String(run.id) === activeRunId;
                    const status = String(run.status ?? "");
                    const badge = STATUS_COLORS[status] ?? "theme-tone theme-tone-neutral";
                    return (
                      <tr
                        key={String(run.id)}
                        className={
                          isSelected
                            ? "theme-table-row bg-muted ring-1 ring-inset ring-foreground/20"
                            : "theme-table-row hover:bg-background"
                        }
                      >
                        <td className="px-4 py-3">
                          {String(run.periodKey ?? "")}
                        </td>
                        <td className="px-4 py-3">
                          {String(
                            (run.payGroup &&
                            typeof run.payGroup === "object"
                              ? String(
                                  (run.payGroup as Record<string, unknown>)
                                    .name ??
                                    (run.payGroup as Record<string, unknown>)
                                      .code ??
                                    "",
                                )
                              : "") || run.payGroupId,
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badge}`}
                          >
                            {tText(STATUS_LABELS[status] ?? status.replace(/_/g, " "))}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {String(run.attendanceSource ?? "")}
                        </td>
                        <td className="px-4 py-3">
                          {rows(run.blockers).length}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-on-tone"
                            onClick={() => {
                              setActiveRunId(String(run.id));
                              setActiveRunPayGroupId(String(run.payGroupId ?? ""));
                              setActiveRunStatus(String(run.status ?? ""));
                            }}
                            type="button"
                          >
                            {isSelected
                              ? tText("Selected")
                              : tText("Select")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
          <RunActionForms
            activeRunId={activeRunId}
            activeRunPayGroupId={activeRunPayGroupId}
            activeRunStatus={activeRunStatus}
            initialEmployeeId={initialEmployeeId}
            onChanged={refresh}
          />
        </div>
      </div>
    </AdminPage>
  );
}

function CreateRunForm({
  onCreated,
}: {
  onCreated: (id: string, payGroupId: string) => void;
}) {
  const { tText } = useTenantLocalization();
  const [form, setForm] = useState({
    payGroupId: "",
    periodKey: today.slice(0, 7),
    periodStart: `${today.slice(0, 7)}-01`,
    periodEnd: today,
  });
  const [payGroups, setPayGroups] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [payGroupsLoading, setPayGroupsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setPayGroupsLoading(true);
    apiClient
      .get("/payroll/pay-groups")
      .then(({ data }) => {
        if (!active) return;
        const list: Record<string, unknown>[] = Array.isArray(data?.data)
          ? data.data as Record<string, unknown>[]
          : [];
        setPayGroups(
          list
            .map((pg: Record<string, unknown>) => ({
              label: `${String(pg.name ?? pg.code ?? "Unnamed pay group")} (${String(pg.code ?? "-")})`,
              value: String(pg.id ?? ""),
            }))
            .filter((o: { value: string }) => o.value),
        );
      })
      .catch(() => {})
      .finally(() => {
        if (active) setPayGroupsLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Panel className="p-5">
      <h2 className="text-base font-semibold">{tText("Choose pay group and month")}</h2>
      <div className="mt-4 grid gap-4">
        {error && (
            <div className="rounded-lg theme-tone theme-tone-amber border p-3 text-sm">
            {error}
          </div>
        )}
        <Field label={tText("Pay group")}>
          <select
            className={inputClass}
            disabled={payGroupsLoading || busy}
            onChange={(event) => {
              setError("");
              setForm((current) => ({
                ...current,
                payGroupId: event.target.value,
              }));
            }}
            value={form.payGroupId}
          >
            <option value="">
              {payGroupsLoading
                ? tText("Loading pay groups")
                : tText("Select pay group")}
            </option>
            {payGroups.map((pg) => (
              <option key={pg.value} value={pg.value}>
                {pg.label}
              </option>
            ))}
          </select>
          {form.payGroupId && (
            <Link
              className="mt-2 inline-flex text-sm font-semibold text-foreground hover:underline"
              href={`/app/employees?payGroupId=${form.payGroupId}`}
            >
              {tText("View employees in this pay group")}
            </Link>
          )}
        </Field>
        <Field label={tText("Salary month")}>
          <input
            className={inputClass}
            onChange={(event) => {
              const period = monthPeriod(event.target.value);
              setForm((current) => ({
                ...current,
                periodKey: event.target.value,
                ...(period
                  ? {
                      periodStart: period.start,
                      periodEnd: period.end,
                    }
                  : {}),
              }));
            }}
            type="month"
            value={form.periodKey}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {tText("Changing the salary month updates the start and end dates.")}
          </p>
        </Field>
        <Field label={tText("Month start")}>
          <input
            className={inputClass}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                periodStart: event.target.value,
              }))
            }
            type="date"
            value={form.periodStart}
          />
        </Field>
        <Field label={tText("Month end")}>
          <input
            className={inputClass}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                periodEnd: event.target.value,
              }))
            }
            type="date"
            value={form.periodEnd}
          />
        </Field>
        <PrimaryButton
          disabled={!form.payGroupId || busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const response = await apiClient.post("/payroll/runs", form);
              onCreated(String(response.data?.data?.id ?? ""), form.payGroupId);
            } catch (submitError) {
              const msg =
                apiError(submitError) || "Failed to create run.";
              if (
                submitError &&
                typeof submitError === "object" &&
                "response" in submitError &&
                (submitError as { response?: { status?: number } }).response
                  ?.status === 409
              ) {
                setError(
                  "A run already exists for this pay group and period. Select it from the Runs table on the right instead.",
                );
              } else {
                setError(msg);
              }
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy
            ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                {tText("Creating...")}
              </span>
            )
            : tText("Create payroll")}
        </PrimaryButton>
      </div>
    </Panel>
  );
}

function RunActionForms({
  activeRunId,
  activeRunPayGroupId,
  activeRunStatus,
  initialEmployeeId,
  onChanged,
}: {
  activeRunId: string;
  activeRunPayGroupId: string;
  activeRunStatus: string;
  initialEmployeeId: string;
  onChanged: () => void | Promise<void>;
}) {
  const { tText } = useTenantLocalization();
  const [employeeId, setEmployeeId] = useState(initialEmployeeId);
  const [reason, setReason] = useState(
    "Reviewed and approved for payroll processing.",
  );
  const [outputKind, setOutputKind] = useState("PAYSLIP");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [showBulkChanges, setShowBulkChanges] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkSalaryChangeRow[]>([
    createBulkSalaryChangeRow(),
  ]);
  const [employees, setEmployees] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [payslips, setPayslips] = useState<Array<Record<string, unknown>>>([]);
  const [payslipsLoading, setPayslipsLoading] = useState(false);

  useEffect(() => {
    if (initialEmployeeId) setEmployeeId(initialEmployeeId);
  }, [initialEmployeeId]);

  useEffect(() => {
    let active = true;
    if (!activeRunPayGroupId) {
      setEmployees([]);
      setEmployeesLoading(false);
      return;
    }
    setEmployeesLoading(true);
    apiClient
      .get("/employees?limit=100")
      .then(async ({ data }) => {
        if (!active) return;
        const list = Array.isArray(data?.data) ? data.data : [];
        const profiles = await Promise.allSettled(
          list.map((emp: Record<string, unknown>) =>
            apiClient.get(`/payroll/employees/${String(emp.id ?? "")}/profile`),
          ),
        );
        if (!active) return;
        const payGroupEmployees = list
          .map((emp: Record<string, unknown>, index: number): {
            emp: Record<string, unknown>;
            profile: Record<string, unknown> | null;
          } => {
            const profileResponse = profiles[index];
            const profile =
              profileResponse?.status === "fulfilled"
                ? profileResponse.value.data?.data ?? profileResponse.value.data
                : null;
            return {
              emp,
              profile:
                profile && typeof profile === "object"
                  ? profile as Record<string, unknown>
                  : null,
            };
          })
          .filter(
            ({ profile }: {
              emp: Record<string, unknown>;
              profile: Record<string, unknown> | null;
            }) =>
              String(profile?.payGroupId ?? "") === activeRunPayGroupId,
          )
          .map(({ emp }: {
            emp: Record<string, unknown>;
            profile: Record<string, unknown> | null;
          }) => ({
              label: `${String(emp.fullName ?? "Unnamed employee")} (${String(emp.employeeCode ?? "-")})`,
              value: String(emp.id ?? ""),
          }))
          .filter((o: { value: string }) => o.value);
        setEmployees(payGroupEmployees);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setEmployeesLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRunPayGroupId]);

  const [csvImportId, setCsvImportId] = useState("");
  const [readiness, setReadiness] = useState<Record<string, unknown> | null>(
    null,
  );

  const loadPayslips = useCallback(async () => {
    if (!activeRunId) {
      setPayslips([]);
      return;
    }
    setPayslipsLoading(true);
    try {
      const response = await apiClient.get(
        `/payroll/runs/${activeRunId}/payslips`,
      );
      setPayslips(rows(response.data));
    } catch {
      setPayslips([]);
    } finally {
      setPayslipsLoading(false);
    }
  }, [activeRunId]);

  useEffect(() => {
    void Promise.resolve().then(loadPayslips);
  }, [loadPayslips]);

  const noRun = !activeRunId;
  const inputsLocked =
    activeRunStatus !== "DRAFT" && activeRunStatus !== "VALIDATING";
  const inputsDisabled = noRun || inputsLocked;

  const canCalculate = ["INPUTS_READY", "CALCULATED", "REVIEWED"].includes(
    activeRunStatus,
  );
  const canReview = activeRunStatus === "CALCULATED";
  const canApprove = activeRunStatus === "REVIEWED";
  const canFinalize = activeRunStatus === "APPROVED";
  const canGenerate = [
    "FINALIZED",
    "OUTPUTS_GENERATED",
    "PUBLISHED",
  ].includes(activeRunStatus);
  const canPublish = ["OUTPUTS_GENERATED", "PUBLISHED"].includes(
    activeRunStatus,
  );
  const canMarkPaid = ["PUBLISHED", "PAID"].includes(activeRunStatus);

  const run = async (
    label: string,
    action: () => Promise<unknown>,
    success: string,
  ) => {
    setMessage("");
    setErrorMsg("");
    setBusy(label);
    try {
      await action();
      setMessage(success);
      await Promise.resolve(onChanged());
      await loadPayslips();
    } catch (err) {
      setErrorMsg(apiError(err));
    } finally {
      setBusy("");
    }
  };

  const spinner = (label: string) =>
    busy === label
      ? (
        <Loader2 className="size-4 animate-spin" />
      )
      : null;

  const isProcessing = busy !== "";
  const bulkCsvText = bulkRowsToCsv(bulkRows);
  const hasCompleteBulkRows = bulkRows.some(
    (row) =>
      row.employeeId &&
      row.kind &&
      row.code.trim() &&
      row.amount.trim() &&
      row.currency.trim(),
  );

  async function downloadPayslip(payslipId: string) {
    setMessage("");
    setErrorMsg("");
    setBusy(`payslip-${payslipId}`);
    try {
      const response = await apiClient.get(
        `/payroll/payslips/${payslipId}/download`,
      );
      const url = String(response.data?.data?.url ?? response.data?.url ?? "");
      if (url) openDownloadUrl(url);
      else setErrorMsg(tText("Payslip PDF is not available yet."));
    } catch (downloadError) {
      setErrorMsg(apiError(downloadError));
    } finally {
      setBusy("");
    }
  }

  return (
    <>
    <Panel className="p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {tText("Payroll work steps")}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">
          {tText("Work on selected payroll")}
        </h2>
      </div>
      <div className="mt-4 grid gap-4">
        {!noRun && activeRunStatus && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl theme-tone theme-tone-neutral border px-3 py-2 text-sm">
            <span className="text-muted-foreground">{tText("Status")}:</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[activeRunStatus] ?? "theme-tone theme-tone-neutral"}`}
            >
              {tText(STATUS_LABELS[activeRunStatus] ?? activeRunStatus.replace(/_/g, " "))}
            </span>
            {!canCalculate && !canReview && !canApprove && !canFinalize &&
                !canGenerate && !canPublish && !canMarkPaid && activeRunStatus === "DRAFT" && (
              <span className="ml-auto text-xs text-muted-foreground">
                1. {tText("Import attendance, add optional changes, then check")}
              </span>
            )}
            {canCalculate && (
              <span className="ml-auto text-xs text-muted-foreground">
                4. {tText("Calculate salary")}
              </span>
            )}
            {canReview && (
              <span className="ml-auto text-xs text-muted-foreground">
                5. {tText("Review salary")}
              </span>
            )}
            {(canApprove || canFinalize) && (
              <span className="ml-auto text-xs text-muted-foreground">
                {tText("Next: approve or finalize")}
              </span>
            )}
            {canGenerate && (
              <span className="ml-auto text-xs text-muted-foreground">
                {tText("Next: generate payslips and files")}
              </span>
            )}
          </div>
        )}
        {errorMsg && (
            <div className="rounded-md theme-tone theme-tone-red border px-3 py-2 text-sm font-medium">
              {errorMsg}
            </div>
        )}
        {message && (
            <div className="rounded-md theme-tone theme-tone-emerald border px-3 py-2 text-sm font-medium">
              {message}
            </div>
        )}
        <Field label={tText("Run ID")}>
          <input
            className={inputClass}
            onChange={(event) => void event}
            readOnly
            value={activeRunId}
          />
          {!activeRunId && (
            <p className="mt-1 text-xs text-muted-foreground">
              {tText(
                "Create payroll above or choose an existing month from the Runs table.",
              )}
            </p>
          )}
          {activeRunId &&
            activeRunStatus !== "DRAFT" &&
            activeRunStatus !== "VALIDATING" && (
              <p className="mt-1 text-xs theme-tone-text">
                {tText(
                  "Salary inputs are locked. Create a new payroll run to make fresh changes.",
                )}
              </p>
            )}
        </Field>
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">
            {tText("1. Import attendance")}
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {tText("Bring attendance for all employees in this payroll run. Salary changes are added after this, before calculation.")}
          </p>
        </div>
        <div className="rounded-lg theme-tone theme-tone-neutral border px-3 py-2 text-xs leading-5">
          {employeesLoading
            ? tText("Loading employees for this payroll.")
            : tText(`${employees.length} employees are ready for attendance import.`)}
        </div>
        <PrimaryButton
          disabled={inputsDisabled || employeesLoading || employees.length === 0 || isProcessing}
          onClick={async () => {
            await run(
              "snapshot",
              async () => {
                await apiClient.post(
                  `/payroll/runs/${activeRunId}/attendance-snapshot`,
                  {
                    source: "attendance-period",
                    checksum: `attendance-period:${activeRunId}`,
                    sourceVersion: "attendance-period-v1",
                    rows: employees.map((employee) => ({
                        employeeId: employee.value,
                        payableDays: 0,
                        lossOfPayDays: 0,
                        overtimeMinutes: 0,
                      })),
                  },
                );
              },
              "Attendance imported for the selected payroll period.",
            );
          }}
        >
          {spinner("snapshot")}
          {tText("Import attendance for this period")}
        </PrimaryButton>
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">
            {tText("2. Salary changes")}
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {tText("Optional")}
            </span>
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {tText("Skip this if there are no bonuses, deductions, corrections, or final-settlement changes.")}
          </p>
        </div>
        <Field label={tText("Employee for one change")}>
          <select
            className={inputClass}
            disabled={employeesLoading || inputsLocked}
            onChange={(event) => setEmployeeId(event.target.value)}
            value={employeeId}
          >
            <option value="">
              {employeesLoading
                ? tText("Loading employees")
                : tText("Select employee")}
            </option>
            {employees.map((emp) => (
              <option key={emp.value} value={emp.value}>
                {emp.label}
              </option>
            ))}
          </select>
        </Field>
        <PrimaryButton
          disabled={inputsDisabled || !employeeId || isProcessing}
          onClick={async () => {
            await run(
              "input",
              async () => {
                await apiClient.post(
                  `/payroll/runs/${activeRunId}/inputs`,
                  {
                    employeeId,
                    kind: "ONE_TIME",
                    code: "ADJUSTMENT",
                    amountMinor: "0",
                    currency: "OMR",
                  },
                );
              },
              "Salary change added.",
            );
          }}
        >
          {spinner("input")}
          {tText("Add employee salary change")}
        </PrimaryButton>
        <div className="border-t border-border pt-4">
          <div className="rounded-xl border border-dashed border-border bg-muted p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {tText("Add many employee salary changes")}
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {tText("Optional. Use this when many employees have bonuses, deductions, or corrections. For one employee, use Add employee salary change above.")}
                </p>
              </div>
              <button
                className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary hover:text-foreground"
                onClick={() => setShowBulkChanges((current) => !current)}
                type="button"
              >
                {showBulkChanges ? tText("Hide") : tText("Open")}
              </button>
            </div>
            {showBulkChanges && (
              <div className="mt-4 grid gap-3">
                <div className="rounded-lg theme-tone theme-tone-neutral border px-3 py-2 text-xs leading-5">
                  <p className="font-semibold">{tText("When to use this")}</p>
                  <p>{tText("Use this table when many employees need a bonus, deduction, or correction in the same payroll month.")}</p>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="min-w-[760px] divide-y divide-border text-sm">
                    <thead className="bg-muted text-left text-xs font-semibold uppercase text-muted-foreground">
                      <tr>
                        {[
                          "Employee",
                          "Change type",
                          "Pay item",
                          "Amount",
                          "Reason",
                          "",
                        ].map((item) => (
                          <th className="px-3 py-2" key={item}>
                            {item ? tText(item) : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {bulkRows.map((row) => (
                        <tr key={row.id}>
                          <td className="min-w-48 px-3 py-2">
                            <select
                              className={inputClass}
                              disabled={inputsLocked || employeesLoading}
                              onChange={(event) => {
                                setBulkRows((current) =>
                                  updateBulkRow(current, row.id, {
                                    employeeId: event.target.value,
                                  }),
                                );
                                setCsvImportId("");
                              }}
                              value={row.employeeId}
                            >
                              <option value="">
                                {employeesLoading
                                  ? tText("Loading employees")
                                  : tText("Select employee")}
                              </option>
                              {employees.map((employee) => (
                                <option key={employee.value} value={employee.value}>
                                  {employee.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="min-w-40 px-3 py-2">
                            <select
                              className={inputClass}
                              disabled={inputsLocked}
                              onChange={(event) => {
                                setBulkRows((current) =>
                                  updateBulkRow(current, row.id, {
                                    code:
                                      event.target.value === "DEDUCTION"
                                        ? "DEDUCTION"
                                        : "BONUS",
                                    kind: "ONE_TIME",
                                  }),
                                );
                                setCsvImportId("");
                              }}
                              value={row.code === "DEDUCTION" ? "DEDUCTION" : "BONUS"}
                            >
                              <option value="BONUS">{tText("Bonus")}</option>
                              <option value="DEDUCTION">{tText("Deduction")}</option>
                            </select>
                          </td>
                          <td className="min-w-36 px-3 py-2">
                            <input
                              className={inputClass}
                              disabled={inputsLocked}
                              onChange={(event) => {
                                setBulkRows((current) =>
                                  updateBulkRow(current, row.id, {
                                    code: event.target.value,
                                  }),
                                );
                                setCsvImportId("");
                              }}
                              placeholder="BONUS"
                              value={row.code}
                            />
                          </td>
                          <td className="min-w-32 px-3 py-2">
                            <input
                              className={inputClass}
                              disabled={inputsLocked}
                              min="0"
                              onChange={(event) => {
                                setBulkRows((current) =>
                                  updateBulkRow(current, row.id, {
                                    amount: event.target.value,
                                  }),
                                );
                                setCsvImportId("");
                              }}
                              placeholder="20.000"
                              step="0.001"
                              type="number"
                              value={row.amount}
                            />
                          </td>
                          <td className="min-w-48 px-3 py-2">
                            <input
                              className={inputClass}
                              disabled={inputsLocked}
                              onChange={(event) => {
                                setBulkRows((current) =>
                                  updateBulkRow(current, row.id, {
                                    reason: event.target.value,
                                  }),
                                );
                                setCsvImportId("");
                              }}
                              placeholder={tText("Monthly bonus")}
                              value={row.reason}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              aria-label={tText("Remove row")}
                              className="grid size-10 place-items-center rounded-lg border border-border text-muted-foreground transition hover:theme-tone-red"
                              disabled={inputsLocked || bulkRows.length === 1}
                              onClick={() => {
                                setBulkRows((current) =>
                                  current.filter((item) => item.id !== row.id),
                                );
                                setCsvImportId("");
                              }}
                              type="button"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  {tText("Amount is entered normally, for example 20.000 OMR. The system converts it for payroll in the background.")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary hover:text-foreground"
                    disabled={inputsLocked}
                    onClick={() => {
                      setBulkRows((current) => [
                        ...current,
                        createBulkSalaryChangeRow(),
                      ]);
                      setCsvImportId("");
                    }}
                    type="button"
                  >
                    <Plus className="mr-1 inline size-3" />
                    {tText("Add row")}
                  </button>
                  <button
                    className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition"
                    disabled={inputsLocked}
                    onClick={() => {
                      setBulkRows([createBulkSalaryChangeRow()]);
                      setCsvImportId("");
                    }}
                    type="button"
                  >
                    {tText("Clear table")}
                  </button>
                </div>
                <PrimaryButton
                  disabled={inputsDisabled || isProcessing || !hasCompleteBulkRows}
                  onClick={async () => {
                    await run("csv-preview", async () => {
                      const response = await apiClient.post(
                        `/payroll/runs/${activeRunId}/input-imports/preview`,
                        {
                          fileName: "payroll-inputs.csv",
                          csvText: bulkCsvText,
                        },
                      );
                      const payload = objectOrNull(response.data?.data);
                      setCsvImportId(String(payload?.id ?? ""));
                    }, "Rows checked.");
                  }}
                >
                  {spinner("csv-preview")}
                  {tText("1. Check rows")}
                </PrimaryButton>
                {csvImportId
                  ? (
                    <>
                      <div className="rounded-md theme-tone theme-tone-emerald border px-3 py-2 text-sm">
                        {tText("Rows are ready to add.")}
                      </div>
                      <PrimaryButton
                        disabled={isProcessing}
                        onClick={async () => {
                          await run("csv-commit", async () => {
                            await apiClient.post(
                              `/payroll/runs/${activeRunId}/input-imports/${csvImportId}/commit`,
                            );
                            setCsvImportId("");
                          }, "Rows added to payroll.");
                        }}
                      >
                        {spinner("csv-commit")}
                        {tText("2. Add rows to payroll")}
                      </PrimaryButton>
                    </>
                  )
                  : null}
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">
            {tText("3. Check payroll")}
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {tText("Check missing salary, bank details, attendance, and other issues before calculation.")}
          </p>
        </div>
        <PrimaryButton
          disabled={inputsDisabled || isProcessing}
          onClick={async () => {
            await run("validate", async () => {
              await apiClient.post(
                `/payroll/runs/${activeRunId}/validate`,
              );
              const response = await apiClient.get(
                `/payroll/runs/${activeRunId}/readiness`,
              );
              setReadiness(objectOrNull(response.data?.data));
            }, "Payroll checked.");
          }}
        >
          {spinner("validate")}
          {tText("Check payroll")}
        </PrimaryButton>
        {readiness && (
          <div className="rounded-md border border-border bg-muted p-3 text-xs text-foreground">
            <div className="font-semibold">
              {tText("Payroll check")}: {String(readiness.status ?? "")}
            </div>
            <div>
              {tText("Ready")}: {String(readiness.ready ?? false)}
            </div>
            <div>
              {tText("Issues")}: {rows(readiness.issues).length}
            </div>
            {rows(readiness.issues).map(
              (issue: Record<string, unknown>, index: number) => {
                const sev = String(issue.severity ?? "");
                const colors =
                  sev === "BLOCKER"
                    ? "theme-tone theme-tone-red border"
                    : sev === "WARNING"
                    ? "theme-tone theme-tone-amber border"
                    : "theme-tone theme-tone-neutral border";
                return (
                  <div
                    key={index}
                    className={`mt-1 rounded border px-2 py-1 ${colors}`}
                  >
                    <span className="font-semibold">{sev}</span>{" "}
                    {String(issue.message ?? "")}
                  </div>
                );
              },
            )}
          </div>
        )}
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">
            {tText("4. Calculate and approve")}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <PrimaryButton
                disabled={noRun || !canCalculate || isProcessing}
                onClick={() =>
                  run(
                    "calculate",
                    () =>
                      apiClient.post(
                        `/payroll/runs/${activeRunId}/calculate`,
                      ),
                    "Salary calculated.",
                  )}
              >
                {spinner("calculate")}
                <PlayCircle className="size-4" />
                {tText("Calculate salary")}
              </PrimaryButton>
              {activeRunId && !canCalculate && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {tText("Check payroll first")}
                </p>
              )}
            </div>
            <div>
              <PrimaryButton
                disabled={noRun || reason.length < 10 || !canReview || isProcessing}
                onClick={() =>
                  run(
                    "review",
                    () =>
                      apiClient.post(
                        `/payroll/runs/${activeRunId}/review`,
                        { reason },
                      ),
                    "Salary reviewed. A different admin must approve it.",
                  )}
              >
                {spinner("review")}
                <CheckCircle2 className="size-4" />
                {tText("Review salary")}
              </PrimaryButton>
              {activeRunId && !canReview && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {tText("Calculate salary first")}
                </p>
              )}
            </div>
            <div>
              <PrimaryButton
                disabled={
                  noRun || reason.length < 10 || !canApprove || isProcessing
                }
                onClick={() =>
                  run(
                    "approve",
                    () =>
                      apiClient.post(
                        `/payroll/runs/${activeRunId}/approve`,
                        { reason },
                      ),
                    "Payroll approved.",
                  )}
              >
                {spinner("approve")}
                <ShieldCheck className="size-4" />
                {tText("Approve")}
              </PrimaryButton>
              {activeRunId && canApprove && (
                <p className="mt-1 text-xs theme-tone-text">
                  {tText("A different admin must approve this payroll.")}
                </p>
              )}
              {activeRunId && !canApprove && activeRunStatus !== "REVIEWED" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {tText("Review salary first")}
                </p>
              )}
            </div>
            <div>
              <PrimaryButton
                disabled={
                  noRun || reason.length < 10 || !canFinalize || isProcessing
                }
                onClick={() =>
                  run(
                    "finalize",
                    () =>
                      apiClient.post(
                        `/payroll/runs/${activeRunId}/finalize`,
                        { reason },
                      ),
                    "Payroll finalized.",
                  )}
              >
                {spinner("finalize")}
                <ShieldCheck className="size-4" />
                {tText("Finalize payroll")}
              </PrimaryButton>
              {activeRunId && !canFinalize && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {tText("Approve payroll first")}
                </p>
              )}
            </div>
          </div>
        </div>
        <Field label={tText("Reason")}>
          <textarea
            className={inputClass}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            value={reason}
          />
        </Field>
      </div>
    </Panel>
    <Panel className="p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {tText("Final outputs")}
          </p>
          <h3 className="mt-1 text-xl font-semibold text-foreground">
            {tText("Payslips, files, and payment")}
          </h3>
          <div className="mt-3 grid gap-3">
            <Field label={tText("Output kind")}>
              <select
                className={inputClass}
                onChange={(event) => setOutputKind(event.target.value)}
                value={outputKind}
              >
                {[
                  "PAYSLIP",
                  "PAYROLL_REGISTER",
                  "BANK_EXPORT",
                  "ACCOUNTING_EXPORT",
                ].map((kind) => (
                  <option key={kind} value={kind}>
                    {tText(outputLabel(kind))}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <PrimaryButton
                  disabled={noRun || !canGenerate || isProcessing}
                  onClick={() =>
                    run(
                      "generate",
                      () =>
                        apiClient.post(
                          `/payroll/runs/${activeRunId}/outputs`,
                          {
                            kind: outputKind,
                            adapterKey: "standard-json-v1",
                          },
                        ),
                      outputKind === "PAYSLIP"
                        ? "Payslips generated."
                        : "File generated.",
                    )}
                >
                  {spinner("generate")}
                  <FileOutput className="size-4" />
                    {outputKind === "PAYSLIP"
                      ? tText("Generate payslips")
                      : tText("Generate file")}
                </PrimaryButton>
                {activeRunId && !canGenerate && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tText("Finalize payroll first")}
                  </p>
                )}
              </div>
              <div>
                <PrimaryButton
                  disabled={noRun || !canPublish || isProcessing}
                  onClick={() =>
                    run(
                      "publish",
                      () =>
                        apiClient.post(
                          `/payroll/runs/${activeRunId}/publish`,
                        ),
                      "Payslips published.",
                    )}
                >
                  {spinner("publish")}
                  <Send className="size-4" />
                  {tText("Publish")}
                </PrimaryButton>
                {activeRunId && !canPublish && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tText("Generate payslips first")}
                  </p>
                )}
              </div>
              <div>
                <PrimaryButton
                  disabled={noRun || !canMarkPaid || isProcessing}
                  onClick={() =>
                    run(
                      "markPaid",
                      () =>
                        apiClient.post(
                          `/payroll/runs/${activeRunId}/payments`,
                          {
                            status: "PAID",
                            reference: `manual:${activeRunId.slice(
                              0,
                              8,
                            )}`,
                          },
                        ),
                      "Payment marked paid.",
                    )}
                >
                  {spinner("markPaid")}
                  <WalletCards className="size-4" />
                  {tText("Mark paid")}
                </PrimaryButton>
                {activeRunId && !canMarkPaid && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tText("Publish payslips first")}
                  </p>
                )}
              </div>
            </div>
            {(message || errorMsg) && (
              <div
                className={`rounded-md theme-tone border px-3 py-2 text-sm font-medium ${
                  errorMsg
                    ? "theme-tone-red"
                    : "theme-tone-emerald"
                }`}
              >
                {errorMsg || message}
              </div>
            )}
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {tText("Generated payslips")}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tText("Download employee payslip PDFs for this payroll run.")}
                  </p>
                </div>
                <button
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary hover:text-foreground"
                  disabled={payslipsLoading || noRun}
                  onClick={() => void loadPayslips()}
                  type="button"
                >
                  {payslipsLoading ? tText("Loading") : tText("Refresh")}
                </button>
              </div>
              {payslipsLoading ? (
                <div className="p-4 text-sm text-muted-foreground">
                  {tText("Loading payslips.")}
                </div>
              ) : payslips.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-muted text-left text-xs font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">{tText("Employee")}</th>
                        <th className="px-4 py-3">{tText("Payslip")}</th>
                        <th className="px-4 py-3">{tText("Net pay")}</th>
                        <th className="px-4 py-3">{tText("Status")}</th>
                        <th className="px-4 py-3">{tText("PDF")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {payslips.map((payslip, index) => {
                        const payslipId = String(payslip.id ?? "");
                        const hasPdf = Boolean(payslip.objectKey);
                        return (
                          <tr key={payslipId || index}>
                            <td className="px-4 py-3">
                              {String(payslip.employeeName ?? payslip.employeeId ?? "-")}
                            </td>
                            <td className="px-4 py-3">
                              {String(payslip.payslipNumber ?? payslip.periodKey ?? "-")}
                            </td>
                            <td className="px-4 py-3">
                              {moneyMinor(payslip.netPayMinor, payslip.currency)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-full theme-tone theme-tone-emerald px-2 py-0.5 text-xs font-semibold">
                                {tText(String(payslip.status ?? "Generated"))}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={!payslipId || !hasPdf || busy === `payslip-${payslipId}`}
                                onClick={() => void downloadPayslip(payslipId)}
                                type="button"
                              >
                                {busy === `payslip-${payslipId}` ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Download className="size-3.5" />
                                )}
                                {tText("Download PDF")}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-sm leading-6 text-muted-foreground">
                  {activeRunStatus === "PAID" ||
                  activeRunStatus === "PUBLISHED" ||
                  activeRunStatus === "OUTPUTS_GENERATED"
                    ? tText("No payslip PDFs are listed for this payroll. Generate payslips before publishing or marking paid.")
                    : tText("Payslip PDFs will appear here after payroll is finalized and generated.")}
                </div>
              )}
            </div>
          </div>
        </div>
    </Panel>
    </>
  );
}

function rows(value: unknown): Array<Record<string, unknown>> {
  const payload =
    value && typeof value === "object" && "data" in value
      ? (value as { data: unknown }).data
      : value;
  if (Array.isArray(payload))
    return payload.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item && typeof item === "object"),
    );
  if (payload && typeof payload === "object")
    return [payload as Record<string, unknown>];
  return [];
}

function objectOrNull(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function label(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function outputLabel(value: string) {
  const labels: Record<string, string> = {
    ACCOUNTING_EXPORT: "Accounting file",
    BANK_EXPORT: "Bank payment file",
    PAYROLL_REGISTER: "Payroll register",
    PAYSLIP: "Payslip PDFs",
  };
  return labels[value] ?? value.replace(/_/g, " ");
}

function createBulkSalaryChangeRow(): BulkSalaryChangeRow {
  return {
    amount: "",
    code: "BONUS",
    currency: "OMR",
    employeeId: "",
    id: `bulk-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind: "ONE_TIME",
    reason: "",
  };
}

function updateBulkRow(
  rowsList: BulkSalaryChangeRow[],
  id: string,
  patch: Partial<BulkSalaryChangeRow>,
) {
  return rowsList.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

function bulkRowsToCsv(rowsList: BulkSalaryChangeRow[]) {
  const lines = ["employeeId,kind,code,amountMinor,currency,reason"];
  rowsList
    .filter(
      (row) =>
        row.employeeId &&
        row.kind &&
        row.code.trim() &&
        row.amount.trim() &&
        row.currency.trim(),
    )
    .forEach((row) => {
      lines.push(
        [
          row.employeeId,
          row.kind,
          row.code.trim().toUpperCase(),
          amountToMinor(row.amount),
          row.currency.trim().toUpperCase(),
          row.reason.trim(),
        ]
          .map(csvCell)
          .join(","),
      );
    });
  return `${lines.join("\n")}\n`;
}

function amountToMinor(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0";
  return String(Math.round(amount * 1000));
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function moneyMinor(value: unknown, currency: unknown) {
  const amount = Number(value ?? 0) / 1000;
  const code = String(currency ?? "OMR");
  if (!Number.isFinite(amount)) return `0.000 ${code}`;
  return `${amount.toFixed(3)} ${code}`;
}

function monthPeriod(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return null;
  const endDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${value}-01`,
    end: `${value}-${String(endDay).padStart(2, "0")}`,
  };
}

function openDownloadUrl(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function apiError(error: unknown) {
  if (error && typeof error === "object" && "response" in error) {
    const data = (
      error as { response?: { data?: { message?: string } } }
    ).response?.data;
    return data?.message ?? "Payroll run request failed.";
  }
  return "Payroll run request failed.";
}

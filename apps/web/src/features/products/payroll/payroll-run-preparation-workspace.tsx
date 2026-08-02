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
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
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
  DRAFT: "bg-zinc-200 text-zinc-700",
  VALIDATING: "bg-amber-200 text-amber-800",
  INPUTS_READY: "bg-blue-200 text-blue-800",
  CALCULATING: "bg-purple-200 text-purple-800",
  CALCULATED: "bg-indigo-200 text-indigo-800",
  REVIEWED: "bg-teal-200 text-teal-800",
  APPROVED: "bg-green-200 text-green-800",
  FINALIZED: "bg-emerald-200 text-emerald-800",
  OUTPUTS_GENERATED: "bg-sky-200 text-sky-800",
  PUBLISHED: "bg-cyan-200 text-cyan-800",
  PAID: "bg-green-300 text-green-900",
  CANCELLED: "bg-red-200 text-red-800",
};

export function PayrollRunPreparationWorkspace() {
  const { tText } = useTenantLocalization();
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [activeRunId, setActiveRunId] = useState("");
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
        if (current) setActiveRunStatus(String(current.status ?? ""));
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
      title={tText("Payroll run preparation")}
      description={tText("Collect and validate immutable payroll inputs before calculation.")}
      action={
        <PrimaryButton onClick={refresh}>
          <RefreshCw className="size-4" />
          {tText("Refresh")}
        </PrimaryButton>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="grid gap-5">
          {error && <ErrorState message={error} />}
          <CreateRunForm
            onCreated={(id) => {
              setActiveRunId(id);
              setActiveRunStatus("DRAFT");
              void refresh();
            }}
          />
          {activeRunId && activeRunStatus && (
            <Panel className="p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {tText("Progress")}
              </h3>
              <div className="flex flex-wrap gap-1">
                {STATUS_STEPS.map((step, index) => {
                  const isCurrent = step === activeRunStatus;
                  const isDone = index < completedCount;
                  return (
                    <div key={step} className="flex items-center gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          isCurrent
                            ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                            : isDone
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-zinc-100 text-zinc-400"
                        }`}
                      >
                        {step.replace(/_/g, " ")}
                      </span>
                      {index < STATUS_STEPS.length - 1 && (
                        <ArrowRight className="size-3 text-zinc-300" />
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}
          <RunActionForms
            activeRunId={activeRunId}
            activeRunStatus={activeRunStatus}
            onChanged={refresh}
          />
        </div>
        <Panel className="overflow-hidden">
          <div className="border-b border-zinc-100 p-5">
            <div className="flex items-center gap-3">
              <PlayCircle className="size-5 text-primary" />
              <h2 className="text-lg font-semibold">{tText("Runs")}</h2>
            </div>
          </div>
          {loading ? (
            <div className="p-5">
              <LoadingState />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-100 text-sm">
                <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-500">
                  <tr>
                    {[
                      "Period",
                      "Pay group",
                      "Status",
                      "Source",
                      "Blockers",
                      "Actions",
                    ].map((item) => (
                      <th className="px-4 py-3" key={item}>
                        {tText(item)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {runs.map((run) => {
                    const isSelected = String(run.id) === activeRunId;
                    const status = String(run.status ?? "");
                    const badge = STATUS_COLORS[status] ?? "bg-zinc-100 text-zinc-700";
                    return (
                      <tr
                        key={String(run.id)}
                        className={
                          isSelected
                            ? "bg-primary/5 ring-1 ring-inset ring-primary/20"
                            : ""
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
                            {status.replace(/_/g, " ")}
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
                            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50"
                            onClick={() => {
                              setActiveRunId(String(run.id));
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
      </div>
    </AdminPage>
  );
}

function CreateRunForm({ onCreated }: { onCreated: (id: string) => void }) {
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
        const list = Array.isArray(data?.data) ? data.data : [];
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
      <h2 className="text-base font-semibold">{tText("Create run")}</h2>
      <div className="mt-4 grid gap-4">
        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
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
        </Field>
        <Field label={tText(label("periodKey"))}>
          <input
            className={inputClass}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                periodKey: event.target.value,
              }))
            }
            type="text"
            value={form.periodKey}
          />
        </Field>
        <Field label={tText(label("periodStart"))}>
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
        <Field label={tText(label("periodEnd"))}>
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
              onCreated(String(response.data?.data?.id ?? ""));
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
            : tText("Create run")}
        </PrimaryButton>
      </div>
    </Panel>
  );
}

function RunActionForms({
  activeRunId,
  activeRunStatus,
  onChanged,
}: {
  activeRunId: string;
  activeRunStatus: string;
  onChanged: () => void;
}) {
  const { tText } = useTenantLocalization();
  const [employeeId, setEmployeeId] = useState("");
  const [reason, setReason] = useState(
    "Reviewed and approved for payroll processing.",
  );
  const [outputKind, setOutputKind] = useState("PAYSLIP");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [employees, setEmployees] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setEmployeesLoading(true);
    apiClient
      .get("/employees?limit=100")
      .then(({ data }) => {
        if (!active) return;
        const list = Array.isArray(data?.data) ? data.data : [];
        setEmployees(
          list
            .map((emp: Record<string, unknown>) => ({
              label: `${String(emp.fullName ?? "Unnamed employee")} (${String(emp.employeeCode ?? "-")})`,
              value: String(emp.id ?? ""),
            }))
            .filter((o: { value: string }) => o.value),
        );
      })
      .catch(() => {})
      .finally(() => {
        if (active) setEmployeesLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [csvText, setCsvText] = useState(
    "employeeId,kind,code,amountMinor,currency,reason\n",
  );
  const [csvImportId, setCsvImportId] = useState("");
  const [readiness, setReadiness] = useState<Record<string, unknown> | null>(
    null,
  );

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
    } catch (err) {
      setErrorMsg(apiError(err));
    } finally {
      setBusy("");
    }
    onChanged();
  };

  const spinner = (label: string) =>
    busy === label
      ? (
        <Loader2 className="size-4 animate-spin" />
      )
      : null;

  const isProcessing = busy !== "";

  return (
    <Panel className="p-5">
      <h2 className="text-base font-semibold">
        {tText("Prepare selected run")}
      </h2>
      <div className="mt-4 grid gap-4">
        {!noRun && activeRunStatus && (
          <div className="flex items-center gap-2 rounded-md border bg-zinc-50 px-3 py-2 text-sm">
            <span className="text-zinc-500">{tText("Status")}:</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[activeRunStatus] ?? "bg-zinc-100 text-zinc-700"}`}
            >
              {activeRunStatus.replace(/_/g, " ")}
            </span>
            {!canCalculate && !canReview && !canApprove && !canFinalize &&
                !canGenerate && !canPublish && !canMarkPaid && activeRunStatus === "DRAFT" && (
              <span className="ml-auto text-xs text-zinc-400">
                1. {tText("Import snapshot & validate")} →
              </span>
            )}
            {canCalculate && (
              <span className="ml-auto text-xs text-zinc-400">
                2. {tText("Calculate now")} →
              </span>
            )}
            {canReview && (
              <span className="ml-auto text-xs text-zinc-400">
                3. {tText("Review now")} →
              </span>
            )}
            {(canApprove || canFinalize) && (
              <span className="ml-auto text-xs text-zinc-400">
                {tText("Next: approve or finalize")} →
              </span>
            )}
            {canGenerate && (
              <span className="ml-auto text-xs text-zinc-400">
                {tText("Next: generate outputs")} →
              </span>
            )}
          </div>
        )}
        {errorMsg && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
            {errorMsg}
          </div>
        )}
        {message && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
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
            <p className="mt-1 text-xs text-zinc-500">
              {tText(
                "Create a run above or click Select on an existing run from the Runs table.",
              )}
            </p>
          )}
          {activeRunId &&
            activeRunStatus !== "DRAFT" &&
            activeRunStatus !== "VALIDATING" && (
              <p className="mt-1 text-xs text-amber-600">
                {tText(
                  "Inputs are locked. Create a new run to prepare fresh inputs.",
                )}
              </p>
            )}
        </Field>
        <Field label={tText("Employee")}>
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
              "snapshot",
              async () => {
                await apiClient.post(
                  `/payroll/runs/${activeRunId}/attendance-snapshot`,
                  {
                    source: "manual-preview",
                    checksum: `manual:${activeRunId}`,
                    sourceVersion: "manual-v1",
                    rows: [
                      {
                        employeeId,
                        payableDays: 30,
                        lossOfPayDays: 0,
                        overtimeMinutes: 0,
                      },
                    ],
                  },
                );
              },
              "Snapshot imported.",
            );
          }}
        >
          {spinner("snapshot")}
          {tText("Import one-row snapshot")}
        </PrimaryButton>
        <PrimaryButton
          disabled={inputsDisabled || isProcessing}
          onClick={async () => {
            await run(
              "input",
              async () => {
                await apiClient.post(
                  `/payroll/runs/${activeRunId}/inputs`,
                  {
                    kind: "ONE_TIME",
                    code: "ADJUSTMENT",
                    amountMinor: "0",
                    currency: "OMR",
                  },
                );
              },
              "Sample input added.",
            );
          }}
        >
          {spinner("input")}
          {tText("Add sample input")}
        </PrimaryButton>
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
            }, "Validation completed.");
          }}
        >
          {spinner("validate")}
          {tText("Validate readiness")}
        </PrimaryButton>
        {readiness && (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
            <div className="font-semibold">
              {tText("Readiness")}: {String(readiness.status ?? "")}
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
                    ? "border-red-100 bg-red-50 text-red-800"
                    : sev === "WARNING"
                    ? "border-amber-100 bg-amber-50 text-amber-800"
                    : "border-blue-100 bg-blue-50 text-blue-800";
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
        <div className="border-t border-zinc-100 pt-4">
          <h3 className="text-sm font-semibold text-zinc-700">
            {tText("CSV inputs")}
          </h3>
          <div className="mt-3 grid gap-3">
            <Field label={tText("CSV text")}>
              <textarea
                className={inputClass}
                disabled={inputsLocked}
                onChange={(event) => {
                  setCsvText(event.target.value);
                  setCsvImportId("");
                }}
                rows={5}
                value={csvText}
              />
            </Field>
            <PrimaryButton
              disabled={inputsDisabled || isProcessing}
              onClick={async () => {
                await run("csv-preview", async () => {
                  const response = await apiClient.post(
                    `/payroll/runs/${activeRunId}/input-imports/preview`,
                    {
                      fileName: "payroll-inputs.csv",
                      csvText,
                    },
                  );
                  const payload = objectOrNull(response.data?.data);
                  setCsvImportId(String(payload?.id ?? ""));
                }, `CSV preview: ${csvImportId ? "1 valid" : "done"}`);
              }}
            >
              {spinner("csv-preview")}
              {tText("1. Validate CSV")}
            </PrimaryButton>
            {csvImportId
              ? (
                <>
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {tText("Validation passed.")}
                  </div>
                  <PrimaryButton
                    disabled={isProcessing}
                    onClick={async () => {
                      await run("csv-commit", async () => {
                        await apiClient.post(
                          `/payroll/runs/${activeRunId}/input-imports/${csvImportId}/commit`,
                        );
                        setCsvImportId("");
                      }, "CSV imported.");
                    }}
                  >
                    {spinner("csv-commit")}
                    {tText("2. Import to run")}
                  </PrimaryButton>
                </>
              )
              : null}
          </div>
        </div>
        <div className="border-t border-zinc-100 pt-4">
          <h3 className="text-sm font-semibold text-zinc-700">
            {tText("Process")}
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
                    "Calculation completed.",
                  )}
              >
                {spinner("calculate")}
                <PlayCircle className="size-4" />
                {tText("Calculate")}
              </PrimaryButton>
              {activeRunId && !canCalculate && (
                <p className="mt-1 text-xs text-zinc-400">
                  {tText("Needs INPUTS_READY")}
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
                    "Run reviewed. A different user must now approve it (4-eyes).",
                  )}
              >
                {spinner("review")}
                <CheckCircle2 className="size-4" />
                {tText("Review")}
              </PrimaryButton>
              {activeRunId && !canReview && (
                <p className="mt-1 text-xs text-zinc-400">
                  {tText("Needs CALCULATED")}
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
                    "Run approved.",
                  )}
              >
                {spinner("approve")}
                <ShieldCheck className="size-4" />
                {tText("Approve")}
              </PrimaryButton>
              {activeRunId && canApprove && (
                <p className="mt-1 text-xs text-amber-600">
                  {tText("Requires a different admin user (4-eyes policy)")}
                </p>
              )}
              {activeRunId && !canApprove && activeRunStatus !== "REVIEWED" && (
                <p className="mt-1 text-xs text-zinc-400">
                  {tText("Needs REVIEWED")}
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
                    "Run finalized.",
                  )}
              >
                {spinner("finalize")}
                <ShieldCheck className="size-4" />
                {tText("Finalize")}
              </PrimaryButton>
              {activeRunId && !canFinalize && (
                <p className="mt-1 text-xs text-zinc-400">
                  {tText("Needs APPROVED")}
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
        <div className="border-t border-zinc-100 pt-4">
          <h3 className="text-sm font-semibold text-zinc-700">
            {tText("Outputs and payment")}
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
                    {kind.replace(/_/g, " ")}
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
                      "Output generated.",
                    )}
                >
                  {spinner("generate")}
                  <FileOutput className="size-4" />
                  {tText("Generate")}
                </PrimaryButton>
                {activeRunId && !canGenerate && (
                  <p className="mt-1 text-xs text-zinc-400">
                    {tText("Needs FINALIZED")}
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
                  <p className="mt-1 text-xs text-zinc-400">
                    {tText("Needs OUTPUTS_GENERATED")}
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
                  <p className="mt-1 text-xs text-zinc-400">
                    {tText("Needs PUBLISHED")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
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

function apiError(error: unknown) {
  if (error && typeof error === "object" && "response" in error) {
    const data = (
      error as { response?: { data?: { message?: string } } }
    ).response?.data;
    return data?.message ?? "Payroll run request failed.";
  }
  return "Payroll run request failed.";
}

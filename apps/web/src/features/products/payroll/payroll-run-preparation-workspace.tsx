"use client";

import {
  CheckCircle2,
  FileOutput,
  PlayCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  WalletCards,
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

export function PayrollRunPreparationWorkspace() {
  const { tText } = useTenantLocalization();
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [activeRunId, setActiveRunId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/payroll/runs");
      setRuns(rows(response.data));
    } catch (refreshError) {
      setError(apiError(refreshError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

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
              void refresh();
            }}
          />
          <RunActionForms activeRunId={activeRunId} onChanged={refresh} />
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
                  {runs.map((run) => (
                    <tr key={String(run.id)}>
                      <td className="px-4 py-3">
                        {String(run.periodKey ?? "")}
                      </td>
                      <td className="px-4 py-3">
                        {String(run.payGroupId ?? "")}
                      </td>
                      <td className="px-4 py-3">{String(run.status ?? "")}</td>
                      <td className="px-4 py-3">
                        {String(run.attendanceSource ?? "")}
                      </td>
                      <td className="px-4 py-3">{rows(run.blockers).length}</td>
                      <td className="px-4 py-3">
                        <button
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold"
                          onClick={() => setActiveRunId(String(run.id))}
                          type="button"
                        >
                          {tText("Select")}
                        </button>
                      </td>
                    </tr>
                  ))}
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
  const [form, setForm] = useState({
    payGroupId: "",
    periodKey: today.slice(0, 7),
    periodStart: `${today.slice(0, 7)}-01`,
    periodEnd: today,
  });
  return (
    <Panel className="p-5">
      <h2 className="text-base font-semibold">{tText("Create run")}</h2>
      <div className="mt-4 grid gap-4">
        {Object.keys(form).map((key) => (
          <Field key={key} label={tText(label(key))}>
            <input
              className={inputClass}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
              type={
                key.includes("period") && key !== "periodKey" ? "date" : "text"
              }
              value={form[key as keyof typeof form]}
            />
          </Field>
        ))}
        <PrimaryButton
          onClick={async () => {
            const response = await apiClient.post("/payroll/runs", form);
            onCreated(String(response.data?.data?.id ?? ""));
          }}
        >
          {tText("Create run")}
        </PrimaryButton>
      </div>
    </Panel>
  );
}

function RunActionForms({
  activeRunId,
  onChanged,
}: {
  activeRunId: string;
  onChanged: () => void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [reason, setReason] = useState(
    "Reviewed and approved for payroll processing.",
  );
  const [outputKind, setOutputKind] = useState("PAYSLIP");
  const [message, setMessage] = useState("");
  const [csvText, setCsvText] = useState(
    "employeeId,kind,code,amountMinor,currency,reason\n",
  );
  const [csvImportId, setCsvImportId] = useState("");
  const [readiness, setReadiness] = useState<Record<string, unknown> | null>(
    null,
  );
  const disabled = !activeRunId;
  const submit = async (action: () => Promise<unknown>, success: string) => {
    setMessage("");
    await action();
    setMessage(success);
    onChanged();
  };
  return (
    <Panel className="p-5">
      <h2 className="text-base font-semibold">{tText("Prepare selected run")}</h2>
      <div className="mt-4 grid gap-4">
        {message && (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
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
        </Field>
        <Field label={tText("Employee ID")}>
          <input
            className={inputClass}
            onChange={(event) => setEmployeeId(event.target.value)}
            value={employeeId}
          />
        </Field>
        <PrimaryButton
          disabled={disabled || !employeeId}
          onClick={async () => {
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
            onChanged();
          }}
        >
          {tText("Import one-row snapshot")}
        </PrimaryButton>
        <PrimaryButton
          disabled={disabled}
          onClick={async () => {
            await apiClient.post(`/payroll/runs/${activeRunId}/inputs`, {
              kind: "ONE_TIME",
              code: "ADJUSTMENT",
              amountMinor: "0",
              currency: "OMR",
            });
            onChanged();
          }}
        >
          {tText("Add sample input")}
        </PrimaryButton>
        <PrimaryButton
          disabled={disabled}
          onClick={async () => {
            await apiClient.post(`/payroll/runs/${activeRunId}/validate`, {});
            const response = await apiClient.get(
              `/payroll/runs/${activeRunId}/readiness`,
            );
            setReadiness(objectOrNull(response.data?.data));
            onChanged();
          }}
        >
          {tText("Validate readiness")}
        </PrimaryButton>
        {readiness && (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
            <div className="font-semibold">
              {tText("Readiness")}: {String(readiness.status ?? "")}
            </div>
            <div>{tText("Ready")}: {String(readiness.ready ?? false)}</div>
            <div>{tText("Issues")}: {rows(readiness.issues).length}</div>
          </div>
        )}
        <div className="border-t border-zinc-100 pt-4">
          <h3 className="text-sm font-semibold text-zinc-700">{tText("CSV inputs")}</h3>
          <div className="mt-3 grid gap-3">
            <Field label={tText("CSV text")}>
              <textarea
                className={inputClass}
                onChange={(event) => setCsvText(event.target.value)}
                rows={5}
                value={csvText}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <PrimaryButton
                disabled={disabled}
                onClick={async () => {
                  const response = await apiClient.post(
                    `/payroll/runs/${activeRunId}/input-imports/preview`,
                    {
                      fileName: "payroll-inputs.csv",
                      csvText,
                    },
                  );
                  const payload = objectOrNull(response.data?.data);
                  setCsvImportId(String(payload?.id ?? ""));
                  setMessage(
                    `CSV preview: ${String(payload?.validRowCount ?? 0)} valid, ${String(payload?.errorCount ?? 0)} errors.`,
                  );
                  onChanged();
                }}
                >
                  {tText("Preview CSV")}
                </PrimaryButton>
                <PrimaryButton
                  disabled={disabled || !csvImportId}
                  onClick={async () => {
                    await submit(
                      () =>
                        apiClient.post(
                          `/payroll/runs/${activeRunId}/input-imports/${csvImportId}/commit`,
                          {},
                        ),
                      tText("CSV import committed."),
                    );
                    setCsvImportId("");
                  }}
                >
                  {tText("Commit CSV")}
                </PrimaryButton>
            </div>
          </div>
        </div>
        <div className="border-t border-zinc-100 pt-4">
          <h3 className="text-sm font-semibold text-zinc-700">{tText("Process")}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <PrimaryButton
              disabled={disabled}
              onClick={() =>
                submit(
                  () =>
                    apiClient.post(
                      `/payroll/runs/${activeRunId}/calculate`,
                      {},
                    ),
                  tText("Calculation completed."),
                )
              }
            >
              <PlayCircle className="size-4" />
              {tText("Calculate")}
            </PrimaryButton>
            <PrimaryButton
              disabled={disabled || reason.length < 10}
              onClick={() =>
                submit(
                  () =>
                    apiClient.post(`/payroll/runs/${activeRunId}/review`, {
                      reason,
                    }),
                  tText("Run reviewed."),
                )
              }
            >
              <CheckCircle2 className="size-4" />
              {tText("Review")}
            </PrimaryButton>
            <PrimaryButton
              disabled={disabled || reason.length < 10}
              onClick={() =>
                submit(
                  () =>
                    apiClient.post(`/payroll/runs/${activeRunId}/approve`, {
                      reason,
                    }),
                  tText("Run approved."),
                )
              }
            >
              <ShieldCheck className="size-4" />
              {tText("Approve")}
            </PrimaryButton>
            <PrimaryButton
              disabled={disabled || reason.length < 10}
              onClick={() =>
                submit(
                  () =>
                    apiClient.post(`/payroll/runs/${activeRunId}/finalize`, {
                      reason,
                    }),
                  tText("Run finalized."),
                )
              }
            >
              <ShieldCheck className="size-4" />
              {tText("Finalize")}
            </PrimaryButton>
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
              <PrimaryButton
                disabled={disabled}
                onClick={() =>
                    submit(
                      () =>
                        apiClient.post(`/payroll/runs/${activeRunId}/outputs`, {
                          kind: outputKind,
                          adapterKey: "standard-json-v1",
                        }),
                      tText("Output generated."),
                    )
                  }
                >
                  <FileOutput className="size-4" />
                  {tText("Generate")}
                </PrimaryButton>
                <PrimaryButton
                  disabled={disabled}
                  onClick={() =>
                    submit(
                      () =>
                        apiClient.post(
                          `/payroll/runs/${activeRunId}/publish`,
                          {},
                        ),
                      tText("Payslips published."),
                    )
                  }
                >
                  <Send className="size-4" />
                  {tText("Publish")}
                </PrimaryButton>
                <PrimaryButton
                  disabled={disabled}
                  onClick={() =>
                    submit(
                      () =>
                        apiClient.post(`/payroll/runs/${activeRunId}/payments`, {
                          status: "PAID",
                          reference: `manual:${activeRunId.slice(0, 8)}`,
                        }),
                      tText("Payment marked paid."),
                    )
                  }
                >
                  <WalletCards className="size-4" />
                  {tText("Mark paid")}
              </PrimaryButton>
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
    return payload.filter((item): item is Record<string, unknown> =>
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
    const data = (error as { response?: { data?: { message?: string } } })
      .response?.data;
    return data?.message ?? "Payroll run request failed.";
  }
  return "Payroll run request failed.";
}

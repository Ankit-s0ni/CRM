"use client";

import {
  Calculator,
  CheckCircle2,
  FileOutput,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useTenantLocalization } from "@/lib/tenant-localization";
import {
  AdminPage,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Panel,
  PrimaryButton,
  StatusBadge,
  inputClass,
} from "@/shared/components/page-primitives";

export function PayrollProcessingWorkspace() {
  const { tText } = useTenantLocalization();
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [activeRunId, setActiveRunId] = useState("");
  const [jobs, setJobs] = useState<Array<Record<string, unknown>>>([]);
  const [reason, setReason] = useState(
    "Reviewed and approved for payroll processing.",
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/payroll/runs");
      const nextRuns = rows(response.data);
      setRuns(nextRuns);
      const selected = activeRunId || String(nextRuns[0]?.id ?? "");
      setActiveRunId(selected);
      if (selected) {
        const jobResponse = await apiClient.get(`/payroll/runs/${selected}/jobs`);
        setJobs(rows(jobResponse.data));
      } else {
        setJobs([]);
      }
    } catch (refreshError) {
      setRuns([]);
      setJobs([]);
      setError(apiError(refreshError, "Payroll processing data could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [activeRunId]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const runAction = async (
    label: string,
    action: () => Promise<unknown>,
  ) => {
    setBusy(label);
    setError("");
    try {
      await action();
      await refresh();
    } catch (actionError) {
      setError(apiError(actionError, "Payroll processing action failed."));
    } finally {
      setBusy("");
    }
  };

  return (
    <AdminPage
      title={tText("Payroll processing")}
      description={tText("Calculate, review, approve, finalize, and monitor payroll runs.")}
      action={
        <PrimaryButton disabled={loading} onClick={refresh}>
          <RefreshCw className="size-4" />
          {tText("Refresh")}
        </PrimaryButton>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Panel className="h-fit p-5">
          <div className="flex items-center gap-3">
            <Calculator className="size-5 text-[#151515]" />
            <h2 className="text-lg font-semibold">{tText("Run controls")}</h2>
          </div>
          <div className="mt-4 grid gap-4">
            <Field label={tText("Payroll run")}>
              <select
                className={inputClass}
                onChange={(event) => setActiveRunId(event.target.value)}
                value={activeRunId}
              >
                <option value="">{tText("Select run")}</option>
                {runs.map((run) => (
                  <option key={String(run.id)} value={String(run.id)}>
                    {String(run.periodKey ?? run.id)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tText("Reason")}>
              <textarea
                className={inputClass}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                value={reason}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <PrimaryButton
                disabled={!activeRunId || Boolean(busy)}
                onClick={() =>
                  runAction("calculate", () =>
                    apiClient.post(`/payroll/runs/${activeRunId}/calculate`, {}),
                  )
                }
              >
                <Calculator className="size-4" />
                {busy === "calculate" ? tText("Calculating") : tText("Calculate")}
              </PrimaryButton>
              <PrimaryButton
                disabled={!activeRunId || reason.length < 10 || Boolean(busy)}
                onClick={() =>
                  runAction("review", () =>
                    apiClient.post(`/payroll/runs/${activeRunId}/review`, { reason }),
                  )
                }
              >
                <CheckCircle2 className="size-4" />
                {tText("Review")}
              </PrimaryButton>
              <PrimaryButton
                disabled={!activeRunId || reason.length < 10 || Boolean(busy)}
                onClick={() =>
                  runAction("approve", () =>
                    apiClient.post(`/payroll/runs/${activeRunId}/approve`, { reason }),
                  )
                }
              >
                <ShieldCheck className="size-4" />
                {tText("Approve")}
              </PrimaryButton>
              <PrimaryButton
                disabled={!activeRunId || reason.length < 10 || Boolean(busy)}
                onClick={() =>
                  runAction("finalize", () =>
                    apiClient.post(`/payroll/runs/${activeRunId}/finalize`, { reason }),
                  )
                }
              >
                <FileOutput className="size-4" />
                {tText("Finalize")}
              </PrimaryButton>
            </div>
          </div>
        </Panel>
        <div className="grid gap-5">
          {error && <ErrorState message={error} />}
          <Panel className="overflow-hidden">
            <div className="border-b border-zinc-100 p-5">
              <h2 className="text-lg font-semibold">{tText("Runs")}</h2>
            </div>
            {loading ? (
              <div className="p-5">
                <LoadingState />
              </div>
            ) : runs.length ? (
              <PayrollTable
                activeRunId={activeRunId}
                onSelect={setActiveRunId}
                rows={runs}
              />
            ) : (
              <EmptyState
                title={tText("No payroll runs")}
                body={tText("Create a run in Run preparation before processing payroll.")}
              />
            )}
          </Panel>
          <Panel className="overflow-hidden">
            <div className="border-b border-zinc-100 p-5">
              <h2 className="text-lg font-semibold">{tText("Processing jobs")}</h2>
            </div>
            {jobs.length ? (
              <PayrollTable rows={jobs} />
            ) : (
              <EmptyState
                title={tText("No processing jobs")}
                body={tText("Run calculation or output generation to see processing jobs here.")}
              />
            )}
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}

function PayrollTable({
  activeRunId,
  onSelect,
  rows: tableRows,
}: {
  activeRunId?: string;
  onSelect?: (id: string) => void;
  rows: Array<Record<string, unknown>>;
}) {
  const { tText } = useTenantLocalization();
  const columns = keys(tableRows).slice(0, 6);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-100 text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-500">
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-3" key={column}>
                {tText(label(column))}
              </th>
            ))}
            {onSelect && <th className="px-4 py-3">{tText("Action")}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {tableRows.map((row, index) => {
            const id = String(row.id ?? index);
            return (
              <tr className={activeRunId === id ? "bg-[#f3efe6]" : undefined} key={id}>
                {columns.map((column) => (
                  <td className="px-4 py-3" key={column}>
                    {column.toLowerCase().includes("status") ? (
                      <StatusBadge>{value(row[column])}</StatusBadge>
                    ) : (
                      value(row[column])
                    )}
                  </td>
                ))}
                {onSelect && (
                  <td className="px-4 py-3">
                    <button
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold"
                      onClick={() => onSelect(id)}
                      type="button"
                    >
                      {tText("Select")}
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function rows(value: unknown): Array<Record<string, unknown>> {
  const payload =
    value && typeof value === "object" && "data" in value
      ? (value as { data: unknown }).data
      : value;
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object"),
    );
  }
  if (payload && typeof payload === "object") return [payload as Record<string, unknown>];
  return [];
}

function keys(tableRows: Array<Record<string, unknown>>) {
  const preferred = ["periodKey", "status", "payGroupId", "startedAt", "completedAt", "createdAt"];
  const all = new Set(tableRows.flatMap((row) => Object.keys(row)));
  return preferred.filter((key) => all.has(key)).concat(
    [...all].filter((key) => !preferred.includes(key) && key !== "id"),
  );
}

function label(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function value(input: unknown) {
  if (input == null) return "-";
  if (Array.isArray(input)) return String(input.length);
  if (typeof input === "object") return JSON.stringify(input);
  return String(input);
}

function apiError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string } } })
      .response;
    if (response?.status === 403) {
      return "Your current role cannot access this payroll area. Ask an admin to add the required payroll permissions.";
    }
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

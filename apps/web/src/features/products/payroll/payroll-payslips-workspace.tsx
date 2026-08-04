"use client";

import { Download, ReceiptText, RefreshCw } from "lucide-react";
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

export function PayrollPayslipsWorkspace() {
  const { tText } = useTenantLocalization();
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [runId, setRunId] = useState("");
  const [payslips, setPayslips] = useState<Array<Record<string, unknown>>>([]);
  const [myPayslips, setMyPayslips] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [runResponse, selfResponse] = await Promise.allSettled([
        apiClient.get("/payroll/runs"),
        apiClient.get("/payroll/payslips/me"),
      ]);
      if (runResponse.status === "fulfilled") {
        const nextRuns = rows(runResponse.value.data);
        setRuns(nextRuns);
        const selected = runId || String(nextRuns[0]?.id ?? "");
        setRunId(selected);
        if (selected) {
          const payslipResponse = await apiClient.get(`/payroll/runs/${selected}/payslips`);
          setPayslips(rows(payslipResponse.data));
        } else {
          setPayslips([]);
        }
      } else {
        setRuns([]);
        setPayslips([]);
        setError(apiError(runResponse.reason, "Payroll runs could not be loaded."));
      }
      if (selfResponse.status === "fulfilled") {
        setMyPayslips(rows(selfResponse.value.data));
      }
    } catch (refreshError) {
      setPayslips([]);
      setError(apiError(refreshError, "Payslips could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const download = async (id: string, self = false) => {
    setError("");
    try {
      const response = await apiClient.get(
        self ? `/payroll/payslips/me/${id}/download` : `/payroll/payslips/${id}/download`,
      );
      const url = String(response.data?.data?.url ?? response.data?.url ?? "");
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      setError(apiError(downloadError, "Payslip download could not be prepared."));
    }
  };

  return (
    <AdminPage
      title={tText("Payslips")}
      description={tText("Review generated payslips and open signed downloads when available.")}
      action={
        <PrimaryButton disabled={loading} onClick={refresh}>
          <RefreshCw className="size-4" />
          {tText("Refresh")}
        </PrimaryButton>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel className="h-fit p-5">
          <div className="flex items-center gap-3">
            <ReceiptText className="size-5 text-[#151515]" />
            <h2 className="text-lg font-semibold">{tText("Payslip source")}</h2>
          </div>
          <div className="mt-4">
            <Field label={tText("Payroll run")}>
              <select
                className={inputClass}
                onChange={(event) => setRunId(event.target.value)}
                value={runId}
              >
                <option value="">{tText("Select run")}</option>
                {runs.map((run) => (
                  <option key={String(run.id)} value={String(run.id)}>
                    {String(run.periodKey ?? run.id)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Panel>
        <div className="grid gap-5">
          {error && <ErrorState message={error} />}
          <Panel className="overflow-hidden">
            <div className="border-b border-zinc-100 p-5">
              <h2 className="text-lg font-semibold">{tText("Run payslips")}</h2>
            </div>
            {loading ? (
              <div className="p-5">
                <LoadingState />
              </div>
            ) : payslips.length ? (
              <PayslipTable onDownload={download} rows={payslips} />
            ) : (
              <EmptyState
                title={tText("No payslips")}
                body={tText("Finalize a payroll run and generate payslips before they appear here.")}
              />
            )}
          </Panel>
          <Panel className="overflow-hidden">
            <div className="border-b border-zinc-100 p-5">
              <h2 className="text-lg font-semibold">{tText("My payslips")}</h2>
            </div>
            {myPayslips.length ? (
              <PayslipTable onDownload={(id) => download(id, true)} rows={myPayslips} />
            ) : (
              <EmptyState
                title={tText("No published payslips")}
                body={tText("Published payslips for your employee profile will appear here.")}
              />
            )}
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}

function PayslipTable({
  onDownload,
  rows: tableRows,
}: {
  onDownload: (id: string) => void;
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
            <th className="px-4 py-3">{tText("Download")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {tableRows.map((row, index) => {
            const id = String(row.id ?? index);
            return (
              <tr key={id}>
                {columns.map((column) => (
                  <td className="px-4 py-3" key={column}>
                    {column.toLowerCase().includes("status") ? (
                      <StatusBadge>{value(row[column])}</StatusBadge>
                    ) : (
                      value(row[column])
                    )}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold"
                    onClick={() => onDownload(id)}
                    type="button"
                  >
                    <Download className="size-3.5" />
                    {tText("Open")}
                  </button>
                </td>
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
  const preferred = ["employeeId", "periodKey", "status", "netPayMinor", "currency", "publishedAt"];
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
      return "Your current role cannot access payslips. Ask an admin to add the required payroll permissions.";
    }
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

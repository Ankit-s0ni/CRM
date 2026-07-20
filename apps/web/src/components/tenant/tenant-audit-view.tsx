"use client";

import { ChevronLeft, ChevronRight, ScrollText, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import {
  AdminPage,
  ErrorState,
  Field,
  LoadingState,
  Panel,
  PrimaryButton,
  inputClass,
} from "./page-primitives";

type AuditRecord = {
  id: string;
  action: string;
  module: string;
  entityType: string | null;
  entityId: string | null;
  actorUserId: string | null;
  actor: { id: string; email: string; status: string } | null;
  impersonated: boolean;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
};

type AuditResponse = {
  data: AuditRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type AuditFilters = {
  search: string;
  module: string;
  action: string;
  from: string;
  to: string;
};

const emptyFilters: AuditFilters = {
  search: "",
  module: "",
  action: "",
  from: "",
  to: "",
};

export function TenantAuditView() {
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [response, setResponse] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiClient
      .get<AuditResponse>("/audit-logs")
      .then(({ data }) => {
        if (active) setResponse(data);
      })
      .catch(() => {
        if (active) setError("Audit history could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function load(page: number, filters = applied) {
    setLoading(true);
    setError("");
    try {
      const params = Object.fromEntries(
        Object.entries({ ...filters, page, limit: 25 }).filter(
          ([, value]) => value !== "",
        ),
      );
      const { data } = await apiClient.get<AuditResponse>("/audit-logs", {
        params,
      });
      setResponse(data);
    } catch {
      setError("Audit history could not be loaded with these filters.");
    } finally {
      setLoading(false);
    }
  }

  function update(key: keyof AuditFilters, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <AdminPage
      title="Audit history"
      description="Trace administrative actions, affected records, and attributed before/after evidence."
    >
      <Panel className="p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-outline" />
              <input
                className={`${inputClass} pl-10`}
                onChange={(event) => update("search", event.target.value)}
                placeholder="Action, entity, request ID"
                value={draft.search}
              />
            </div>
          </Field>
          <Field label="Module">
            <input
              className={inputClass}
              onChange={(event) => update("module", event.target.value)}
              placeholder="organization"
              value={draft.module}
            />
          </Field>
          <Field label="Action contains">
            <input
              className={inputClass}
              onChange={(event) => update("action", event.target.value)}
              placeholder="employee.updated"
              value={draft.action}
            />
          </Field>
          <Field label="From">
            <input
              className={inputClass}
              onChange={(event) => update("from", event.target.value)}
              type="date"
              value={draft.from}
            />
          </Field>
          <Field label="To">
            <input
              className={inputClass}
              onChange={(event) => update("to", event.target.value)}
              type="date"
              value={draft.to}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <PrimaryButton
            onClick={() => {
              setApplied(draft);
              void load(1, draft);
            }}
          >
            Apply filters
          </PrimaryButton>
          <button
            className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold"
            onClick={() => {
              setDraft(emptyFilters);
              setApplied(emptyFilters);
              void load(1, emptyFilters);
            }}
            type="button"
          >
            Clear
          </button>
        </div>
      </Panel>

      {error && <div className="mt-5"><ErrorState message={error} /></div>}
      {loading ? (
        <div className="mt-5"><LoadingState /></div>
      ) : response?.data.length ? (
        <Panel className="mt-5 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h2 className="font-bold">Workspace changes</h2>
              <p className="mt-1 text-sm text-outline">
                {response.pagination.total} matching audit records
              </p>
            </div>
            <span className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-bold text-primary">
              Read only
            </span>
          </div>
          {response.data.map((record) => (
            <AuditRow key={record.id} record={record} />
          ))}
          <Pagination response={response} onPage={(page) => void load(page)} />
        </Panel>
      ) : (
        <Panel className="mt-5 p-10 text-center">
          <ScrollText className="mx-auto size-9 text-outline" />
          <h2 className="mt-4 font-bold">No matching audit history</h2>
          <p className="mt-2 text-sm text-outline">
            Clear filters or perform an authorized workspace change first.
          </p>
        </Panel>
      )}
    </AdminPage>
  );
}

function AuditRow({ record }: { record: AuditRecord }) {
  return (
    <details className="group border-t border-surface-variant px-5 py-4">
      <summary className="grid cursor-pointer list-none gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(160px,.7fr)_170px] sm:items-center">
        <div className="min-w-0">
          <strong className="block truncate text-sm">{humanize(record.action)}</strong>
          <span className="mt-1 block truncate text-xs text-outline">
            {record.module} · {record.entityType ?? "Workspace"}
            {record.entityId ? ` · ${record.entityId}` : ""}
          </span>
        </div>
        <div className="text-xs text-zinc-500">
          <strong className="block text-zinc-700">
            {record.actor?.email ?? "System process"}
          </strong>
          {record.impersonated ? "Platform impersonation" : "Workspace session"}
        </div>
        <time className="text-xs text-outline" dateTime={record.createdAt}>
          {new Date(record.createdAt).toLocaleString()}
        </time>
      </summary>
      <div className="mt-4 grid gap-4 rounded-xl bg-zinc-50 p-4 lg:grid-cols-2">
        <Evidence title="Previous value" value={record.oldValue} />
        <Evidence title="New value" value={record.newValue} />
        <div className="text-xs text-zinc-500 lg:col-span-2">
          Request: {record.requestId ?? "Not recorded"} · IP: {record.ipAddress ?? "Not recorded"}
        </div>
      </div>
    </details>
  );
}

function Evidence({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <strong className="text-xs uppercase tracking-wide text-zinc-500">{title}</strong>
      <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-zinc-700">
        {value == null ? "Not recorded" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function Pagination({
  response,
  onPage,
}: {
  response: AuditResponse;
  onPage: (page: number) => void;
}) {
  const { page, totalPages } = response.pagination;
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-surface-variant p-4">
      <button
        aria-label="Previous audit page"
        className="grid size-10 place-items-center rounded-lg border border-zinc-300 disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        type="button"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="text-sm text-zinc-500">Page {page} of {totalPages}</span>
      <button
        aria-label="Next audit page"
        className="grid size-10 place-items-center rounded-lg border border-zinc-300 disabled:opacity-40"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        type="button"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

function humanize(value: string) {
  return value.replaceAll(".", " ").replaceAll("_", " ");
}

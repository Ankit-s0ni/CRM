"use client";

import { ChevronLeft, ChevronRight, Eye, Search, ShieldCheck, X } from "lucide-react";
import { useEffect, useDeferredValue, useState } from "react";
import { Input } from "@/components/ui/input";
import { platformApiClient } from "@/lib/platform-api-client";
import type { SystemAuditLog } from "@/lib/platform-types";

type AuditResponse = { data: SystemAuditLog[]; pagination: { page: number; pages: number; total: number } };

export function GlobalAuditLogs() {
  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [module, setModule] = useState("");
  const [selected, setSelected] = useState<SystemAuditLog | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    platformApiClient.get<AuditResponse>("/platform/audit-logs", { params: { page, limit: 20, search: deferredSearch || undefined, module: module || undefined } }).then(({ data }) => {
      if (!active) return; setLogs(data.data); setPagination(data.pagination); setError("");
    }).catch(() => { if (active) setError("Audit records could not be loaded."); });
    return () => { active = false; };
  }, [page, deferredSearch, module]);

  return <div className="mx-auto max-w-[1500px] p-5 lg:p-8"><div className="mb-6"><h1 className="text-3xl font-bold tracking-tight">Global Audit Logs</h1><p className="mt-1 text-sm text-on-surface-variant">Immutable activity records across platform and tenant operations.</p></div>
    <div className="rounded-xl border border-outline-variant bg-white shadow-sm"><div className="flex flex-wrap gap-3 border-b border-surface-variant p-5"><div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-10 pl-9" placeholder="Search action, module, or request ID..." /></div><select value={module} onChange={(event) => { setModule(event.target.value); setPage(1); }} className="h-10 rounded-lg border border-outline-variant bg-white px-3 text-sm"><option value="">All modules</option><option value="platform.auth">Authentication</option><option value="platform.tenants">Tenants</option><option value="platform.modules">Modules</option><option value="platform.operations">Operations</option></select></div>
    {error && <div className="m-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-zinc-50 text-[10px] uppercase tracking-wider text-on-surface-variant"><tr><th className="p-4">Timestamp</th><th className="p-4">Actor</th><th className="p-4">Action</th><th className="p-4">Module</th><th className="p-4">Tenant</th><th className="p-4">Request</th><th className="p-4" /></tr></thead><tbody className="divide-y divide-outline-variant">{logs.map((log) => <tr key={log.id} className="hover:bg-zinc-50"><td className="whitespace-nowrap p-4 text-xs text-on-surface-variant">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.createdAt))}</td><td className="p-4 text-sm"><div className="font-medium">{log.actor?.email || "System"}</div>{log.impersonationSessionId && <div className="text-[10px] font-semibold text-amber-700">Impersonated</div>}</td><td className="p-4 text-sm font-semibold">{log.action}</td><td className="p-4"><span className="rounded-full bg-zinc-50 px-2 py-1 text-[10px] font-semibold text-primary">{log.module}</span></td><td className="p-4 text-xs">{log.tenant?.companyName || "Platform"}</td><td className="max-w-40 truncate p-4 font-mono text-[10px] text-outline">{log.requestId || "-"}</td><td className="p-4"><button onClick={() => setSelected(log)} className="grid size-8 place-items-center rounded-lg hover:bg-outline-variant" aria-label="View audit details"><Eye className="size-4" /></button></td></tr>)}</tbody></table>{!logs.length && !error && <div className="grid min-h-56 place-items-center text-sm text-outline"><div className="text-center"><ShieldCheck className="mx-auto mb-3 size-8 text-zinc-200" />No audit records match these filters.</div></div>}</div>
    <div className="flex items-center justify-between border-t border-surface-variant p-4 text-xs text-on-surface-variant"><span>{pagination.total} records</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="grid size-8 place-items-center rounded border disabled:opacity-40"><ChevronLeft className="size-4" /></button><span>Page {pagination.page} of {pagination.pages}</span><button disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)} className="grid size-8 place-items-center rounded border disabled:opacity-40"><ChevronRight className="size-4" /></button></div></div></div>
    {selected && <div className="fixed inset-0 z-[80] flex justify-end bg-black/30" onClick={() => setSelected(null)}><aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><div className="text-xs font-semibold uppercase text-primary">Audit detail</div><h2 className="mt-1 text-xl font-bold">{selected.action}</h2></div><button onClick={() => setSelected(null)}><X /></button></div><dl className="mt-7 grid grid-cols-2 gap-5 text-sm"><Detail label="Actor" value={selected.actor?.email || "System"} /><Detail label="Tenant" value={selected.tenant?.companyName || "Platform"} /><Detail label="IP address" value={selected.ipAddress || "Not captured"} /><Detail label="Request ID" value={selected.requestId || "Not captured"} /></dl><JsonBlock label="Previous value" value={selected.oldValue} /><JsonBlock label="New value" value={selected.newValue} /></aside></div>}
  </div>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-outline">{label}</dt><dd className="mt-1 break-all font-medium">{value}</dd></div>; }
function JsonBlock({ label, value }: { label: string; value: unknown }) { return <div className="mt-7"><h3 className="mb-2 text-sm font-semibold">{label}</h3><pre className="max-h-72 overflow-auto rounded-lg bg-zinc-800 p-4 text-xs text-zinc-200">{value == null ? "No value" : JSON.stringify(value, null, 2)}</pre></div>; }

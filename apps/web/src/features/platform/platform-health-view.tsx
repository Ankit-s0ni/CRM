"use client";

import { Activity, AlertTriangle, CheckCircle2, Database, HardDrive, Layers3, RefreshCw, Server, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { platformApiClient } from "@/lib/platform-api-client";
import type { PlatformHealth, SystemAlert } from "@/lib/platform-types";
import type { PaymentProviderHealth } from "@/lib/billing-types";

const serviceIcons = { api: Server, database: Database, redis: Layers3, objectStorage: HardDrive, queue: Activity };
type AlertResponse = { data: SystemAlert[]; pagination: { total: number } };

export function PlatformHealthView() {
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [payments, setPayments] = useState<PaymentProviderHealth | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy("refresh");
    try {
      const [healthResponse, alertsResponse, paymentResponse] = await Promise.all([
        platformApiClient.get<PlatformHealth>("/platform/health"),
        platformApiClient.get<AlertResponse>("/platform/alerts", { params: { page: 1, limit: 25 } }),
        platformApiClient.get<{ data: PaymentProviderHealth }>("/platform/health/payment-providers"),
      ]);
      setHealth(healthResponse.data); setAlerts(alertsResponse.data.data); setPayments(paymentResponse.data.data); setError("");
    } catch { setError("System observability data could not be loaded."); }
    finally { setBusy(""); }
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([
      platformApiClient.get<PlatformHealth>("/platform/health"),
      platformApiClient.get<AlertResponse>("/platform/alerts", { params: { page: 1, limit: 25 } }),
      platformApiClient.get<{ data: PaymentProviderHealth }>("/platform/health/payment-providers"),
    ]).then(([healthResponse, alertsResponse, paymentResponse]) => {
      if (!active) return;
      setHealth(healthResponse.data);
      setAlerts(alertsResponse.data.data);
      setPayments(paymentResponse.data.data);
    }).catch(() => { if (active) setError("System observability data could not be loaded."); });
    return () => { active = false; };
  }, []);

  async function decide(alert: SystemAlert, action: "acknowledge" | "resolve") {
    const note = window.prompt(`${action === "acknowledge" ? "Acknowledgement" : "Resolution"} note`);
    if (!note?.trim()) return;
    setBusy(alert.id);
    try { await platformApiClient.post(`/platform/alerts/${alert.id}/${action}`, { note }); await load(); }
    catch { setError(`The alert could not be ${action}d.`); setBusy(""); }
  }

  return <div className="mx-auto max-w-[1500px] space-y-6 p-5 lg:p-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">System Observability</h1><p className="mt-1 text-sm text-on-surface-variant">Real-time infrastructure health and operational alerts.</p></div><Button variant="outline" onClick={() => void load()} disabled={busy === "refresh"}><RefreshCw className={busy === "refresh" ? "animate-spin" : ""} />Refresh data</Button></div>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Object.entries(health?.services || {}).map(([name, service]) => { const Icon = serviceIcons[name as keyof typeof serviceIcons] || Activity; const healthy = service.status === "up"; return <div key={name} className="rounded-xl border border-surface-variant bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div className="grid size-10 place-items-center rounded-lg bg-zinc-50 text-primary"><Icon className="size-5" /></div>{healthy ? <CheckCircle2 className="size-5 text-emerald-600" /> : <XCircle className="size-5 text-red-600" />}</div><div className="mt-5 text-sm font-bold capitalize">{name.replace(/([A-Z])/g, " $1")}</div><div className={`mt-1 text-xs font-semibold ${healthy ? "text-emerald-700" : "text-red-700"}`}>{service.status.toUpperCase()}</div><div className="mt-4 text-[11px] text-outline">{service.latencyMs != null ? `${service.latencyMs}ms latency` : `${service.pending || 0} pending · ${service.deadLettered || 0} dead`}</div></div>; })}{!health && <div className="col-span-full py-16 text-center text-sm text-outline">Checking dependencies...</div>}</div>
    <section className="rounded-xl border border-surface-variant bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Payment-provider health</h2><p className="mt-1 text-xs text-outline">Live provider latency plus authenticated webhook processing lag.</p></div><span className="text-xs text-outline">Checked {payments ? new Intl.DateTimeFormat("en-IN", { timeStyle: "medium" }).format(new Date(payments.checkedAt)) : "—"}</span></div><div className="mt-5 grid gap-4 md:grid-cols-3">{payments?.providers.map((provider) => <div className="rounded-xl bg-zinc-50 p-4" key={provider.provider}><div className="flex items-center justify-between"><strong className="text-sm">{provider.provider}</strong>{provider.status === "up" ? <CheckCircle2 className="size-4 text-emerald-600" /> : <XCircle className="size-4 text-red-600" />}</div><div className="mt-4 text-xl font-bold">{provider.latencyMs}ms</div><div className="mt-1 text-xs text-outline">{provider.detail || "Provider is responding"}</div></div>)}<div className="rounded-xl bg-zinc-50 p-4"><div className="flex items-center justify-between"><strong className="text-sm">Webhooks</strong>{(payments?.webhook.failed ?? 0) === 0 ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertTriangle className="size-4 text-red-600" />}</div><div className="mt-4 text-xl font-bold">{payments?.webhook.lagSeconds == null ? "No events" : `${payments.webhook.lagSeconds}s lag`}</div><div className="mt-1 text-xs text-outline">{payments?.webhook.pending ?? 0} pending · {payments?.webhook.failed ?? 0} failed</div></div></div></section>
    <section className="overflow-hidden rounded-xl border border-surface-variant bg-white shadow-sm"><div className="flex items-center justify-between border-b border-surface-variant p-5"><div><h2 className="font-semibold">System alerts</h2><p className="text-xs text-outline">Incidents requiring platform-owner attention</p></div><span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">{alerts.filter((alert) => alert.status === "OPEN").length} open</span></div><div className="divide-y divide-outline-variant">{alerts.map((alert) => <article key={alert.id} className="flex flex-wrap items-center gap-4 p-5"><div className={`grid size-10 place-items-center rounded-full ${alert.severity === "CRITICAL" ? "bg-red-100 text-red-700" : alert.severity === "WARNING" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}><AlertTriangle className="size-5" /></div><div className="min-w-60 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{alert.title}</h3><span className="rounded bg-zinc-50 px-2 py-0.5 text-[9px] font-bold">{alert.alertType.replaceAll("_", " ")}</span></div><p className="mt-1 text-xs text-outline">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(alert.createdAt))}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${alert.status === "RESOLVED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{alert.status}</span>{alert.status === "OPEN" && <Button size="sm" variant="outline" disabled={busy === alert.id} onClick={() => void decide(alert, "acknowledge")}>Acknowledge</Button>}{alert.status !== "RESOLVED" && <Button size="sm" className="bg-primary text-white" disabled={busy === alert.id} onClick={() => void decide(alert, "resolve")}>Resolve</Button>}</article>)}{!alerts.length && <div className="grid min-h-56 place-items-center text-center text-sm text-outline"><div><CheckCircle2 className="mx-auto mb-3 size-9 text-emerald-500" />No system alerts. Everything looks healthy.</div></div>}</div></section>
  </div>;
}

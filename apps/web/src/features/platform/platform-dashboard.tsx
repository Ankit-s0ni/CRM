"use client";

import { AlertTriangle, ArrowUpRight, Building2, CreditCard, IndianRupee, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { platformApiClient } from "@/lib/platform-api-client";
import type { PlatformDashboardData, PlatformHealth } from "@/lib/platform-types";
import type { BillingDashboardData } from "@/lib/billing-types";
import { formatMoney } from "@/lib/billing-types";

const statusClass = {
  ACTIVE: "status-badge status-active",
  TRIAL: "bg-muted text-foreground",
  SUSPENDED: "status-badge status-blocked",
  CHURNED: "bg-muted text-muted-foreground",
};

export function PlatformDashboard() {
  const [data, setData] = useState<PlatformDashboardData | null>(null);
  const [billing, setBilling] = useState<BillingDashboardData | null>(null);
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      platformApiClient.get<PlatformDashboardData>("/platform/dashboard"),
      platformApiClient.get<PlatformHealth>("/platform/health"),
      platformApiClient.get<{ data: BillingDashboardData }>("/platform/dashboard/billing"),
    ]).then(([dashboard, healthResponse, billingResponse]) => {
      if (!active) return;
      setData(dashboard.data);
      setHealth(healthResponse.data);
      setBilling(billingResponse.data.data);
    }).catch(() => { if (active) setError("We couldn't load the operations dashboard."); });
    return () => { active = false; };
  }, []);

  if (error) return <PageState message={error} />;
  if (!data) return <PageState message="Loading regional operations..." />;

  const cards = [
    { label: "Monthly recurring revenue", value: billing?.revenueByCurrency.map(({ currency, mrr }) => formatMoney(mrr, currency)).join(" + ") || "No revenue", detail: "Authoritative active per-seat subscriptions", icon: IndianRupee, tone: "text-foreground bg-muted" },
    { label: "Active tenants", value: data.metrics.activeTenants.toLocaleString(), detail: `${data.metrics.suspendedTenants} suspended`, icon: Building2, tone: "theme-tone-icon theme-tone-emerald" },
    { label: "Total employees", value: data.metrics.employees.toLocaleString(), detail: `Across ${data.metrics.tenants} workspaces`, icon: Users, tone: "text-foreground bg-muted" },
    { label: "Failed payments", value: String(billing?.failedPaymentsThisMonth ?? 0), detail: `${formatMoney(billing?.outstanding ?? "0", billing?.revenueByCurrency[0]?.currency ?? "OMR")} outstanding`, icon: CreditCard, tone: "theme-tone-icon theme-tone-red" },
  ];

  const planTotal = Math.max(1, data.planMix.reduce((sum, plan) => sum + plan.tenants, 0));
  return <div className="mx-auto max-w-[1500px] space-y-6 p-5 lg:p-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight text-foreground">Regional Operations Center</h1><p className="mt-1 text-sm text-on-surface-variant">Real-time overview of the DeltCRM ecosystem.</p></div><Link href="/platform/tenants" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-tone shadow">Manage tenants</Link></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, detail, icon: Icon, tone }) => <div key={label} className="rounded-xl border border-surface-variant bg-card p-5 shadow-sm"><div className="flex items-start justify-between"><div className={`grid size-10 place-items-center rounded-lg ${tone}`}><Icon className="size-5" /></div><ArrowUpRight className="size-4 text-outline" /></div><div className="mt-5 text-2xl font-bold">{value}</div><div className="mt-1 text-xs font-semibold text-on-surface-variant">{label}</div><div className="mt-3 text-[11px] text-outline">{detail}</div></div>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
      <section className="rounded-xl border border-surface-variant bg-card p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Revenue ledger</h2><p className="text-xs text-outline">Provider-confirmed collections and active MRR</p></div><Link href="/platform/billing" className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">Open billing</Link></div><div className="mt-7 grid gap-4 sm:grid-cols-2">{billing?.revenueByCurrency.map((entry) => <div className="rounded-xl bg-muted p-5" key={entry.currency}><div className="text-[10px] font-bold uppercase tracking-wider text-outline">{entry.currency}</div><div className="mt-3 text-2xl font-bold">{formatMoney(entry.mrr, entry.currency)}</div><div className="mt-1 text-xs text-on-surface-variant">monthly recurring revenue</div><div className="mt-5 border-t border-surface-variant pt-4 text-sm"><span className="text-outline">Collected this month</span><strong className="float-right">{formatMoney(entry.collectedThisMonth, entry.currency)}</strong></div></div>)}{!billing?.revenueByCurrency.length && <div className="col-span-full grid min-h-44 place-items-center rounded-xl bg-muted text-sm text-outline">Revenue begins when a paid plan has active seats.</div>}</div></section>
      <section className="rounded-xl border border-surface-variant bg-card p-6 shadow-sm"><h2 className="font-semibold">Tenants by plan</h2><p className="text-xs text-outline">Current subscription mix</p><div className="mt-7 space-y-5">{data.planMix.length ? data.planMix.map((plan, index) => <div key={plan.planId}><div className="mb-2 flex justify-between text-sm"><span className="font-medium">{plan.name}</span><span>{plan.tenants}</span></div><div className="h-2 overflow-hidden rounded-full bg-outline-variant"><div className={index % 2 ? "h-full theme-tone theme-tone-emerald" : "h-full bg-primary-container"} style={{ width: `${Math.max(8, plan.tenants / planTotal * 100)}%` }} /></div></div>) : <p className="py-12 text-center text-sm text-outline">No active subscriptions yet.</p>}</div></section>
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]"><section className="overflow-hidden rounded-xl border border-surface-variant bg-card shadow-sm"><div className="flex items-center justify-between border-b border-surface-variant p-5"><div><h2 className="font-semibold">Recent signups</h2><p className="text-xs text-outline">Newest tenant workspaces</p></div><Link href="/platform/tenants" className="text-xs font-semibold text-foreground">View all</Link></div><div className="divide-y divide-outline-variant">{data.recentTenants.map((tenant) => <Link key={tenant.id} href={`/platform/tenants/${tenant.id}`} className="grid grid-cols-[1fr_auto] gap-4 p-4 hover:bg-surface-variant"><div><div className="text-sm font-semibold">{tenant.companyName}</div><div className="text-xs text-outline">{tenant.subdomain} · {tenant.plan || "No plan"}</div></div><span className={`self-center rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass[tenant.status]}`}>{tenant.status}</span></Link>)}</div></section><section className="rounded-xl border border-surface-variant bg-card p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold">System health</h2><p className="text-xs text-outline">Live dependency checks</p></div>{health?.status === "degraded" && <AlertTriangle className="size-5 theme-tone-text theme-tone-amber" />}</div><div className="mt-5 space-y-4">{Object.entries(health?.services || {}).map(([name, service]) => <div key={name} className="flex items-center justify-between text-sm"><span className="capitalize">{name.replace(/([A-Z])/g, " $1")}</span><span className={`flex items-center gap-2 text-xs font-semibold ${service.status === "up" ? "theme-tone-text theme-tone-emerald" : "theme-tone-text theme-tone-red"}`}><i className={`size-2 rounded-full ${service.status === "up" ? "theme-tone theme-tone-emerald" : "theme-tone theme-tone-red"}`} />{service.status}</span></div>)}</div><Link href="/platform/health" className="mt-6 block rounded-lg bg-muted p-3 text-center text-xs font-semibold text-foreground">Open observability</Link></section></div>
  </div>;
}

function PageState({ message }: { message: string }) { return <div className="grid min-h-[70vh] place-items-center p-8 text-sm text-on-surface-variant">{message}</div>; }

import { AlertCircle, CheckCircle2, Clock3 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const statusTones: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PAID: "bg-emerald-100 text-emerald-800",
  SUCCEEDED: "bg-emerald-100 text-emerald-800",
  OPEN: "bg-blue-100 text-blue-800",
  TRIALING: "bg-blue-100 text-blue-800",
  PENDING: "bg-amber-100 text-amber-800",
  REMINDED: "bg-amber-100 text-amber-800",
  GRACE: "bg-orange-100 text-orange-800",
  PAST_DUE: "bg-orange-100 text-orange-800",
  SUSPEND_PENDING: "bg-red-100 text-red-800",
  SUSPENDED: "bg-red-100 text-red-800",
  FAILED: "bg-red-100 text-red-800",
  VOID: "bg-slate-100 text-slate-700",
  UNCOLLECTIBLE: "bg-slate-100 text-slate-700",
  INACTIVE: "bg-slate-100 text-slate-700",
};

export function BillingPage({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1500px] space-y-6 p-5 lg:p-8"><header className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#4f46e5]">Revenue operations</div><h1 className="text-3xl font-bold tracking-tight text-[#1b1b24]">{title}</h1><p className="mt-1 max-w-3xl text-sm text-[#646273]">{description}</p></div>{action}</header>{children}</div>;
}

export function BillingPanel({ title, description, action, children, className }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={cn("overflow-hidden rounded-2xl border border-[#e4e1ee] bg-white shadow-sm", className)}>{(title || action) && <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece8f2] px-5 py-4"><div>{title && <h2 className="font-semibold text-[#24232d]">{title}</h2>}{description && <p className="mt-0.5 text-xs text-[#777587]">{description}</p>}</div>{action}</header>}{children}</section>;
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide", statusTones[normalized] ?? "bg-[#f0ecf9] text-[#464555]")}>{normalized.replaceAll("_", " ")}</span>;
}

export function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) {
  return <article className="rounded-2xl border border-[#e4e1ee] bg-white p-5 shadow-sm"><div className="grid size-10 place-items-center rounded-xl bg-[#efecff] text-[#3525cd]">{icon}</div><div className="mt-5 text-2xl font-bold tracking-tight">{value}</div><div className="mt-1 text-xs font-semibold text-[#464555]">{label}</div><p className="mt-3 text-[11px] leading-5 text-[#777587]">{detail}</p></article>;
}

export function BillingNotice({ tone = "info", children }: { tone?: "info" | "success" | "warning" | "danger"; children: ReactNode }) {
  const styles = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-900",
  };
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Clock3 : AlertCircle;
  return <div className={cn("flex items-start gap-3 rounded-xl border p-4 text-sm", styles[tone])}><Icon className="mt-0.5 size-4 shrink-0" /><div>{children}</div></div>;
}

export function BillingLoading() {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div className="h-40 animate-pulse rounded-2xl bg-[#ece8f2]" key={index} />)}</div>;
}

export function BillingError({ message }: { message: string }) {
  return <BillingNotice tone="danger">{message}</BillingNotice>;
}

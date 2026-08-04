import { AlertCircle, CheckCircle2, Clock3 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const statusTones: Record<string, string> = {
  ACTIVE: "theme-tone theme-tone-emerald",
  PAID: "theme-tone theme-tone-emerald",
  SUCCEEDED: "theme-tone theme-tone-emerald",
  OPEN: "bg-muted text-foreground",
  TRIALING: "bg-muted text-foreground",
  PENDING: "theme-tone theme-tone-amber",
  REMINDED: "theme-tone theme-tone-amber",
  GRACE: "theme-tone theme-tone-amber",
  PAST_DUE: "theme-tone theme-tone-amber",
  SUSPEND_PENDING: "theme-tone theme-tone-red",
  SUSPENDED: "theme-tone theme-tone-red",
  FAILED: "theme-tone theme-tone-red",
  VOID: "bg-muted text-muted-foreground",
  UNCOLLECTIBLE: "bg-muted text-muted-foreground",
  INACTIVE: "bg-muted text-muted-foreground",
};

export function BillingPage({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1500px] space-y-6 p-5 lg:p-8"><header className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-foreground">Revenue operations</div><h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1><p className="mt-1 max-w-3xl text-sm text-on-surface-variant">{description}</p></div>{action}</header>{children}</div>;
}

export function BillingPanel({ title, description, action, children, className }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={cn("overflow-hidden rounded-2xl border border-surface-variant bg-card shadow-sm", className)}>{(title || action) && <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div>{title && <h2 className="font-semibold text-foreground">{title}</h2>}{description && <p className="mt-0.5 text-xs text-outline">{description}</p>}</div>{action}</header>}{children}</section>;
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide", statusTones[normalized] ?? "bg-muted text-on-surface-variant")}>{normalized.replaceAll("_", " ")}</span>;
}

export function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) {
  return <article className="rounded-2xl border border-surface-variant bg-card p-5 shadow-sm"><div className="grid size-10 place-items-center rounded-xl bg-muted text-foreground">{icon}</div><div className="mt-5 text-2xl font-bold tracking-tight">{value}</div><div className="mt-1 text-xs font-semibold text-on-surface-variant">{label}</div><p className="mt-3 text-[11px] leading-5 text-outline">{detail}</p></article>;
}

export function BillingNotice({ tone = "info", children }: { tone?: "info" | "success" | "warning" | "danger"; children: ReactNode }) {
  const styles = {
    info: "border-border bg-muted text-foreground",
    success: "theme-tone theme-tone-emerald border",
    warning: "theme-tone theme-tone-amber border",
    danger: "theme-tone theme-tone-red border",
  };
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Clock3 : AlertCircle;
  return <div className={cn("flex items-start gap-3 rounded-xl border p-4 text-sm", styles[tone])}><Icon className="mt-0.5 size-4 shrink-0" /><div>{children}</div></div>;
}

export function BillingLoading() {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div className="h-40 animate-pulse rounded-2xl bg-muted" key={index} />)}</div>;
}

export function BillingError({ message }: { message: string }) {
  return <BillingNotice tone="danger">{message}</BillingNotice>;
}

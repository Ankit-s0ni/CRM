"use client";

import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BillingError,
  BillingLoading,
  BillingNotice,
  BillingPage,
  BillingPanel,
  MetricCard,
  StatusBadge,
} from "@/components/billing/billing-primitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { platformApiClient } from "@/lib/platform-api-client";
import { usePlatformAuthStore } from "@/lib/platform-auth-store";
import type { PlatformModule } from "@/lib/platform-types";
import type {
  BillingDashboardData,
  BillingInvoice,
  BillingPlan,
  BillingTransaction,
  DunningSubscription,
  Paginated,
} from "@/lib/billing-types";
import { formatBillingDate, formatMoney } from "@/lib/billing-types";
import { cn } from "@/lib/utils";

const billingLinks = [
  { label: "Overview", href: "/platform/billing" },
  { label: "Invoices", href: "/platform/billing/invoices" },
  { label: "Payments", href: "/platform/billing/payments" },
  { label: "Dunning", href: "/platform/billing/dunning" },
];

export function PlatformBillingOverview() {
  const [data, setData] = useState<BillingDashboardData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    platformApiClient
      .get<{ data: BillingDashboardData }>("/platform/dashboard/billing")
      .then(({ data }) => setData(data.data))
      .catch(() =>
        setError("Authoritative billing metrics could not be loaded."),
      );
  }, []);
  return (
    <BillingPage
      title="Billing operations"
      description="Authoritative recurring revenue, collections, outstanding balances and subscription movement across DeltCRM."
      action={
        <Link
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
          href="/platform/plans"
        >
          Manage plans
        </Link>
      }
    >
      <PlatformBillingNav active="/platform/billing" />
      {error && <BillingError message={error} />}
      {!data ? (
        <BillingLoading />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<Banknote className="size-5" />}
              label="Monthly recurring revenue"
              value={
                data.revenueByCurrency
                  .map(({ currency, mrr }) => formatMoney(mrr, currency))
                  .join(" + ") || "No revenue"
              }
              detail="Calculated from active per-seat subscriptions"
            />
            <MetricCard
              icon={<CreditCard className="size-5" />}
              label="Collected this month"
              value={
                data.revenueByCurrency
                  .map(({ currency, collectedThisMonth }) =>
                    formatMoney(collectedThisMonth, currency),
                  )
                  .join(" + ") || "No collections"
              }
              detail="Only succeeded payment transactions"
            />
            <MetricCard
              icon={<FileText className="size-5" />}
              label="Outstanding invoices"
              value={formatMoney(
                data.outstanding,
                data.revenueByCurrency[0]?.currency ?? "INR",
              )}
              detail="Current open invoice balance"
            />
            <MetricCard
              icon={<AlertTriangle className="size-5" />}
              label="Failed payments"
              value={String(data.failedPaymentsThisMonth)}
              detail="Failed provider attempts during this month"
            />
          </div>
          <BillingPanel
            title="Recent subscriptions"
            description="Newest tenant subscription activity"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <TableHead
                  columns={["Tenant", "Plan", "Seats", "Status", "Period end"]}
                />
                <tbody className="divide-y divide-outline-variant">
                  {data.recentSubscriptions.map((subscription) => (
                    <tr key={subscription.id}>
                      <td className="p-4">
                        <strong>{subscription.tenant.companyName}</strong>
                        <div className="text-xs text-outline">
                          {subscription.tenant.subdomain}
                        </div>
                      </td>
                      <td className="p-4">{subscription.plan.name}</td>
                      <td className="p-4">{subscription.seatCount}</td>
                      <td className="p-4">
                        <StatusBadge status={subscription.status} />
                      </td>
                      <td className="p-4">
                        {formatBillingDate(subscription.currentPeriodEnd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BillingPanel>
        </>
      )}
    </BillingPage>
  );
}

export function PlatformPlansView() {
  const permissions = usePlatformAuthStore(
    (state) => state.user?.permissions ?? [],
  );
  const canManage = permissions.includes("platform.plans.manage");
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [modules, setModules] = useState<PlatformModule[]>([]);
  const [selected, setSelected] = useState<BillingPlan | null | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [planResponse, moduleResponse] = await Promise.all([
        platformApiClient.get<{ data: BillingPlan[] }>("/platform/plans"),
        platformApiClient.get<{ data: PlatformModule[] }>("/platform/catalog"),
      ]);
      setPlans(planResponse.data.data);
      setModules(moduleResponse.data.data);
      setError("");
    } catch {
      setError("Plans and feature bundles could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([
      platformApiClient.get<{ data: BillingPlan[] }>("/platform/plans"),
      platformApiClient.get<{ data: PlatformModule[] }>("/platform/catalog"),
    ])
      .then(([planResponse, moduleResponse]) => {
        if (!active) return;
        setPlans(planResponse.data.data);
        setModules(moduleResponse.data.data);
      })
      .catch(() => {
        if (active) setError("Plans and feature bundles could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <BillingPage
      title="Plans & entitlements"
      description="Define exactly which products, Attendance features, add-ons and employee limits each plan grants."
      action={
        canManage ? (
          <Button
            className="bg-primary text-white"
            onClick={() => setSelected(null)}
          >
            <Plus />
            Create plan
          </Button>
        ) : undefined
      }
    >
      {error && <BillingError message={error} />}
      {loading ? (
        <BillingLoading />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <article
              className={cn(
                "flex flex-col rounded-2xl border bg-white p-5 shadow-sm",
                plan.isActive
                  ? "border-surface-variant"
                  : "border-dashed border-zinc-300 opacity-75",
              )}
              key={plan.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">{plan.name}</h2>
                    <StatusBadge
                      status={plan.isActive ? "ACTIVE" : "INACTIVE"}
                    />
                  </div>
                  <p className="mt-2 min-h-10 text-xs leading-5 text-outline">
                    {plan.description}
                  </p>
                </div>
                {canManage && (
                  <Button
                    aria-label={`Edit ${plan.name}`}
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelected(plan)}
                  >
                    <Pencil />
                  </Button>
                )}
              </div>
              <div className="mt-6 text-3xl font-bold text-primary">
                {formatMoney(plan.pricePerUser, plan.currency)}
              </div>
              <div className="text-xs text-outline">
                per employee · {plan.billingPeriod.toLowerCase()}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <PlanFact
                  label="Employee limit"
                  value={plan.maxEmployees.toLocaleString()}
                />
                <PlanFact
                  label="Subscriptions"
                  value={String(plan._count?.subscriptions ?? 0)}
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {plan.modules.map(({ module }) => (
                  <span
                    className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-green-700"
                    key={module.id}
                  >
                    {module.name}
                  </span>
                ))}
              </div>
              <div className="mt-5 border-t border-outline-variant pt-4">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-outline">
                  Included features
                </div>
                <div className="space-y-2">
                  {plan.capabilities?.slice(0, 6).map(({ capability }) => (
                    <div
                      className="flex items-center gap-2 text-xs"
                      key={capability.id}
                    >
                      <Check className="size-3.5 text-green-600" />
                      {capability.name}
                    </div>
                  ))}
                  {(plan.capabilities?.length ?? 0) > 6 && (
                    <div className="text-xs font-semibold text-primary">
                      +{plan.capabilities.length - 6} more features
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {selected !== undefined && (
        <PlanEditor
          plan={selected}
          modules={modules}
          onClose={() => setSelected(undefined)}
          onSaved={() => {
            setSelected(undefined);
            void load();
          }}
        />
      )}
    </BillingPage>
  );
}

export function PlatformInvoicesView() {
  const [result, setResult] = useState<Paginated<BillingInvoice> | null>(null);
  const [detail, setDetail] = useState<BillingInvoice | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    platformApiClient
      .get<Paginated<BillingInvoice>>("/platform/invoices", {
        params: {
          search: search || undefined,
          status: status || undefined,
          limit: 50,
        },
      })
      .then(({ data }) => {
        if (active) {
          setResult(data);
          setError("");
        }
      })
      .catch(() => {
        if (active) setError("Invoices could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [search, status]);
  async function open(invoice: BillingInvoice) {
    try {
      const { data } = await platformApiClient.get<{ data: BillingInvoice }>(
        `/platform/invoices/${invoice.id}`,
      );
      setDetail(data.data);
    } catch {
      setError("Invoice detail could not be loaded.");
    }
  }
  return (
    <BillingPage
      title="Invoices"
      description="Search immutable tenant GST invoices, tax snapshots and payment evidence."
    >
      <PlatformBillingNav active="/platform/billing/invoices" />
      <BillingFilters
        search={search}
        status={status}
        onSearch={setSearch}
        onStatus={setStatus}
        statuses={["OPEN", "PAID", "VOID", "UNCOLLECTIBLE"]}
      />
      {error && <BillingError message={error} />}
      <BillingPanel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <TableHead
              columns={[
                "Invoice",
                "Tenant",
                "Plan",
                "Total",
                "Due",
                "Status",
                "",
              ]}
            />
            <tbody className="divide-y divide-outline-variant">
              {result?.data.map((invoice) => (
                <tr className="hover:bg-zinc-50" key={invoice.id}>
                  <td className="p-4 font-semibold">{invoice.invoiceNumber}</td>
                  <td className="p-4">
                    <strong>{invoice.tenant?.companyName}</strong>
                    <div className="text-xs text-outline">
                      {invoice.tenant?.subdomain}
                    </div>
                  </td>
                  <td className="p-4">{invoice.subscription?.plan.name}</td>
                  <td className="p-4 font-semibold">
                    {formatMoney(invoice.totalAmount, invoice.currency)}
                  </td>
                  <td className="p-4">{formatBillingDate(invoice.dueDate)}</td>
                  <td className="p-4">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void open(invoice)}
                    >
                      Inspect
                      <ArrowRight />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!result && (
            <div className="p-10 text-center text-sm text-outline">
              Loading invoices...
            </div>
          )}
          {result && !result.data.length && (
            <div className="p-10 text-center text-sm text-outline">
              No invoices match these filters.
            </div>
          )}
        </div>
      </BillingPanel>
      {detail && (
        <InvoiceDrawer invoice={detail} onClose={() => setDetail(null)} />
      )}
    </BillingPage>
  );
}

export function PlatformPaymentsView() {
  const [result, setResult] = useState<Paginated<BillingTransaction> | null>(
    null,
  );
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    platformApiClient
      .get<Paginated<BillingTransaction>>("/platform/payment-transactions", {
        params: {
          provider: provider || undefined,
          status: status || undefined,
          limit: 50,
        },
      })
      .then(({ data }) => setResult(data))
      .catch(() => setError("Payment attempts could not be loaded."));
  }, [provider, status]);
  return (
    <BillingPage
      title="Payment attempts"
      description="Every provider charge attempt is retained for support and accounting evidence."
    >
      <PlatformBillingNav active="/platform/billing/payments" />
      <div className="flex flex-wrap gap-3">
        <select
          className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm"
          value={provider}
          onChange={(event) => setProvider(event.target.value)}
        >
          <option value="">All providers</option>
          <option value="RAZORPAY">Razorpay</option>
          <option value="STRIPE">Stripe</option>
        </select>
        <select
          className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          {["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      {error && <BillingError message={error} />}
      <BillingPanel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <TableHead
              columns={[
                "Attempt",
                "Tenant / invoice",
                "Provider",
                "Amount",
                "Status",
                "Reason",
                "Time",
              ]}
            />
            <tbody className="divide-y divide-outline-variant">
              {result?.data.map((payment) => (
                <tr key={payment.id}>
                  <td className="p-4 font-mono text-xs">
                    {payment.gatewayRef || payment.id.slice(0, 12)}
                  </td>
                  <td className="p-4">
                    <strong>{payment.invoice?.tenant?.companyName}</strong>
                    <div className="text-xs text-outline">
                      {payment.invoice?.invoiceNumber}
                    </div>
                  </td>
                  <td className="p-4">{payment.gateway}</td>
                  <td className="p-4 font-semibold">
                    {formatMoney(payment.amount, payment.currency)}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={payment.status} />
                  </td>
                  <td className="max-w-56 p-4 text-xs text-outline">
                    {payment.failureReason || "—"}
                  </td>
                  <td className="p-4 text-xs">
                    {formatBillingDate(payment.attemptedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result && !result.data.length && (
            <div className="p-10 text-center text-sm text-outline">
              No payment attempts match these filters.
            </div>
          )}
        </div>
      </BillingPanel>
    </BillingPage>
  );
}

export function PlatformDunningView() {
  const permissions = usePlatformAuthStore(
    (state) => state.user?.permissions ?? [],
  );
  const canRetry = permissions.includes("platform.dunning.manage");
  const [result, setResult] = useState<Paginated<DunningSubscription> | null>(
    null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    try {
      const { data } = await platformApiClient.get<
        Paginated<DunningSubscription>
      >("/platform/dunning", { params: { limit: 50 } });
      setResult(data);
      setError("");
    } catch {
      setError("Dunning queue could not be loaded.");
    }
  }, []);
  useEffect(() => {
    let active = true;
    platformApiClient
      .get<Paginated<DunningSubscription>>("/platform/dunning", {
        params: { limit: 50 },
      })
      .then(({ data }) => {
        if (active) {
          setResult(data);
          setError("");
        }
      })
      .catch(() => {
        if (active) setError("Dunning queue could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);
  async function retry(subscription: DunningSubscription) {
    const reason = window.prompt(
      "Auditable reason for manually retrying this payment",
    );
    if (!reason || reason.trim().length < 10) return;
    setBusy(subscription.id);
    try {
      await platformApiClient.post(
        `/platform/dunning/${subscription.id}/retry`,
        {
          invoiceId: subscription.invoices.find(
            ({ status }) => status === "OPEN",
          )?.id,
          reason,
        },
      );
      await load();
    } catch (cause) {
      const message = (cause as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setError(
        message ||
          "Payment retry failed. A fresh MFA session and active payment method are required.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <BillingPage
      title="Dunning queue"
      description="Review reminder, grace, suspend-pending and suspended subscriptions with fully audited retries."
    >
      <PlatformBillingNav active="/platform/billing/dunning" />
      {error && <BillingError message={error} />}
      {!result ? (
        <BillingLoading />
      ) : result.data.length ? (
        <div className="grid gap-4">
          {result.data.map((subscription) => {
            const invoice = subscription.invoices.find(
              ({ status }) => status === "OPEN",
            );
            return (
              <BillingPanel key={subscription.id}>
                <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="flex items-start gap-4">
                    <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-red-100 text-red-700">
                      <AlertTriangle />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold">
                          {subscription.tenant.companyName}
                        </h2>
                        <StatusBadge status={subscription.dunningState} />
                        <StatusBadge status={subscription.tenant.status} />
                      </div>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {subscription.plan.name} · {subscription.seatCount}{" "}
                        seats ·{" "}
                        {invoice
                          ? `${invoice.invoiceNumber} for ${formatMoney(invoice.amountDue, invoice.currency)}`
                          : "No open invoice"}
                      </p>
                      <p className="mt-3 text-xs text-outline">
                        Latest action:{" "}
                        {subscription.dunningHistory[0]?.reason ||
                          "Payment requires attention"}
                      </p>
                    </div>
                  </div>
                  {canRetry && (
                    <Button
                      className="bg-primary text-white"
                      disabled={!invoice || busy === subscription.id}
                      onClick={() => void retry(subscription)}
                    >
                      <RefreshCw
                        className={
                          busy === subscription.id ? "animate-spin" : ""
                        }
                      />
                      Retry payment
                    </Button>
                  )}
                </div>
              </BillingPanel>
            );
          })}
        </div>
      ) : (
        <BillingNotice tone="success">
          The dunning queue is clear. No tenant is currently past due.
        </BillingNotice>
      )}
    </BillingPage>
  );
}

function PlatformBillingNav({ active }: { active: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-surface-variant bg-white p-1">
      {billingLinks.map((link) => (
        <Link
          className={cn(
            "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold",
            active === link.href
              ? "bg-primary text-white"
              : "text-on-surface-variant hover:bg-zinc-50",
          )}
          href={link.href}
          key={link.href}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function BillingFilters({
  search,
  status,
  onSearch,
  onStatus,
  statuses,
}: {
  search: string;
  status: string;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  statuses: string[];
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative min-w-64 flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline" />
        <Input
          className="pl-9"
          placeholder="Search invoice or tenant..."
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
      </div>
      <select
        className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm"
        value={status}
        onChange={(event) => onStatus(event.target.value)}
      >
        <option value="">All statuses</option>
        {statuses.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
    </div>
  );
}

function PlanEditor({
  plan,
  modules,
  onClose,
  onSaved,
}: {
  plan: BillingPlan | null;
  modules: PlatformModule[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState(1);
  const [value, setValue] = useState({
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    pricePerUser: plan?.pricePerUser ?? "",
    currency: plan?.currency ?? "INR",
    maxEmployees: plan?.maxEmployees ?? 100,
    billingPeriod: plan?.billingPeriod ?? "MONTHLY",
    isActive: plan?.isActive ?? true,
    moduleKeys: plan?.modules.map(({ module }) => module.key) ?? [],
    capabilityKeys:
      plan?.capabilities?.map(({ capability }) => capability.key) ?? [],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [impact, setImpact] = useState<null | {
    affectedTenantCount: number;
    removedModuleKeys: string[];
    removedCapabilityKeys: string[];
    tenantsOverEmployeeLimit: number;
  }>(null);
  const assignableModules = modules
    .filter(({ availability }) => availability === "AVAILABLE")
    .flatMap((module) => [
      module,
      ...(module.addOns ?? []).filter(
        ({ availability }) => availability === "AVAILABLE",
      ),
    ]);
  const capabilities = modules.flatMap((module) => module.capabilities ?? []);

  function selectModule(module: PlatformModule, selected: boolean) {
    const moduleKeys = new Set(value.moduleKeys);
    const capabilityKeys = new Set(value.capabilityKeys);
    if (selected) {
      moduleKeys.add(module.key);
      module.dependencyKeys.forEach((key) => moduleKeys.add(key));
      if (module.kind === "PRODUCT") {
        module.capabilities
          ?.filter(({ isCore }) => isCore)
          .forEach(({ key }) => capabilityKeys.add(key));
      }
    } else {
      moduleKeys.delete(module.key);
      for (const candidate of assignableModules) {
        if (candidate.dependencyKeys.includes(module.key))
          moduleKeys.delete(candidate.key);
      }
      for (const capability of capabilities) {
        if (capability.requiredModuleKeys.includes(module.key))
          capabilityKeys.delete(capability.key);
      }
    }
    setValue({
      ...value,
      moduleKeys: [...moduleKeys],
      capabilityKeys: [...capabilityKeys],
    });
  }

  function selectCapability(key: string, selected: boolean) {
    const next = new Set(value.capabilityKeys);
    const includeDependencies = (capabilityKey: string) => {
      next.add(capabilityKey);
      const capability = capabilities.find(
        (item) => item.key === capabilityKey,
      );
      capability?.dependencyKeys.forEach(includeDependencies);
    };
    if (selected) includeDependencies(key);
    else {
      next.delete(key);
      let changed = true;
      while (changed) {
        changed = false;
        for (const capability of capabilities) {
          if (
            next.has(capability.key) &&
            capability.dependencyKeys.some(
              (dependency) => !next.has(dependency),
            )
          ) {
            next.delete(capability.key);
            changed = true;
          }
        }
      }
    }
    setValue({ ...value, capabilityKeys: [...next] });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (step < 3) {
      if (step === 2 && plan) {
        setBusy(true);
        setError("");
        try {
          const { data } = await platformApiClient.post<{
            data: NonNullable<typeof impact>;
          }>(`/platform/plans/${plan.id}/impact`, value);
          setImpact(data.data);
        } catch (cause) {
          const message = (
            cause as { response?: { data?: { message?: string } } }
          ).response?.data?.message;
          setError(message || "Plan impact could not be calculated.");
          setBusy(false);
          return;
        }
        setBusy(false);
      }
      setStep(step + 1);
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (plan)
        await platformApiClient.patch(`/platform/plans/${plan.id}`, {
          ...value,
          impactAcknowledged: Boolean(impact),
        });
      else await platformApiClient.post("/platform/plans", value);
      onSaved();
    } catch (cause) {
      const message = (cause as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setError(
        message || "Plan could not be saved. Review its feature dependencies.",
      );
    } finally {
      setBusy(false);
    }
  }

  const canContinue =
    step === 1
      ? value.name.trim().length >= 2 &&
        Boolean(value.pricePerUser) &&
        value.maxEmployees > 0
      : value.moduleKeys.length > 0;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/45 p-4">
      <form
        className="mx-auto my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
        onSubmit={submit}
      >
        <div className="flex items-start gap-4">
          <div className="grid size-11 place-items-center rounded-xl bg-zinc-50 text-primary">
            <Boxes />
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {plan ? "Edit plan" : "Create plan"}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Define commercial details, included features, and review the
              complete entitlement.
            </p>
          </div>
          <button
            aria-label="Close plan editor"
            className="ml-auto"
            onClick={onClose}
            type="button"
          >
            <X />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {["Basics", "Products & features", "Review"].map((label, index) => (
            <div
              className={cn(
                "rounded-lg px-3 py-2 text-center text-xs font-semibold",
                step === index + 1
                  ? "bg-primary text-white"
                  : step > index + 1
                    ? "bg-green-100 text-green-700"
                    : "bg-zinc-50 text-outline",
              )}
              key={label}
            >
              {step > index + 1 ? "✓ " : `${index + 1}. `}
              {label}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-5">
            <BillingError message={error} />
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <FormField label="Plan name">
              <Input
                required
                minLength={2}
                value={value.name}
                onChange={(event) =>
                  setValue({ ...value, name: event.target.value })
                }
              />
            </FormField>
            <FormField label="Price per employee">
              <Input
                required
                inputMode="decimal"
                pattern="\d+(\.\d{1,3})?"
                value={value.pricePerUser}
                onChange={(event) =>
                  setValue({ ...value, pricePerUser: event.target.value })
                }
              />
            </FormField>
            <FormField label="Currency">
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                disabled={Boolean(plan)}
                value={value.currency}
                onChange={(event) =>
                  setValue({ ...value, currency: event.target.value })
                }
              >
                {["INR", "AED", "OMR", "QAR", "SAR", "USD"].map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Billing interval">
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={value.billingPeriod}
                onChange={(event) =>
                  setValue({
                    ...value,
                    billingPeriod: event.target.value as "MONTHLY" | "YEARLY",
                  })
                }
              >
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </FormField>
            <FormField label="Maximum employees">
              <Input
                required
                min={1}
                type="number"
                value={value.maxEmployees}
                onChange={(event) =>
                  setValue({
                    ...value,
                    maxEmployees: Number(event.target.value),
                  })
                }
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Description">
                <textarea
                  className="min-h-24 rounded-lg border border-zinc-300 p-3 text-sm"
                  value={value.description}
                  onChange={(event) =>
                    setValue({ ...value, description: event.target.value })
                  }
                />
              </FormField>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-6">
            <div>
              <h3 className="font-semibold">Products and add-ons</h3>
              <p className="mt-1 text-xs text-outline">
                Add-ons automatically include their required parent product.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {assignableModules.map((module) => {
                  const checked = value.moduleKeys.includes(module.key);
                  return (
                    <label
                      className="flex items-start gap-3 rounded-xl border border-surface-variant p-4"
                      key={module.id}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) =>
                          selectModule(module, Boolean(next))
                        }
                      />
                      <span>
                        <strong className="text-sm">{module.name}</strong>
                        <span className="mt-1 block text-xs leading-5 text-outline">
                          {module.description}
                        </span>
                        <span className="mt-2 block text-[10px] font-semibold uppercase text-primary">
                          {module.kind === "ADD_ON"
                            ? `Add-on · Requires ${module.dependencyKeys.join(", ")}`
                            : "Product"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            {value.moduleKeys.includes("ATTENDANCE") && (
              <div>
                <h3 className="font-semibold">Attendance features</h3>
                <p className="mt-1 text-xs text-outline">
                  Core and dependent features are included automatically and
                  cannot form an invalid bundle.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {capabilities.map((capability) => {
                    const unavailable = capability.requiredModuleKeys.some(
                      (key) => !value.moduleKeys.includes(key),
                    );
                    const checked = value.capabilityKeys.includes(
                      capability.key,
                    );
                    return (
                      <label
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-4",
                          unavailable
                            ? "border-dashed border-zinc-300 bg-zinc-50 opacity-60"
                            : "border-surface-variant",
                        )}
                        key={capability.id}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={capability.isCore || unavailable}
                          onCheckedChange={(next) =>
                            selectCapability(capability.key, Boolean(next))
                          }
                        />
                        <span>
                          <strong className="text-sm">{capability.name}</strong>
                          <span className="mt-1 block text-xs leading-5 text-outline">
                            {capability.description}
                          </span>
                          {capability.isCore && (
                            <span className="mt-2 block text-[10px] font-semibold uppercase text-green-700">
                              Included with Attendance
                            </span>
                          )}
                          {unavailable && (
                            <span className="mt-2 block text-[10px] font-semibold text-amber-700">
                              Requires{" "}
                              {capability.requiredModuleKeys
                                .filter(
                                  (key) => !value.moduleKeys.includes(key),
                                )
                                .join(", ")}
                            </span>
                          )}
                          {!unavailable &&
                            !capability.isCore &&
                            capability.dependencyKeys.length > 0 && (
                              <span className="mt-2 block text-[10px] font-semibold text-primary">
                                Requires {capability.dependencyKeys.join(", ")}
                              </span>
                            )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-5">
            {plan && impact && (
              <div
                className={cn(
                  "rounded-xl border p-4 text-sm",
                  impact.removedCapabilityKeys.length ||
                    impact.removedModuleKeys.length ||
                    impact.tenantsOverEmployeeLimit
                    ? "border-amber-300 bg-amber-50 text-amber-950"
                    : "border-green-200 bg-green-50 text-green-900",
                )}
              >
                <div className="font-semibold">Plan change impact</div>
                <p className="mt-1 leading-6">
                  {impact.affectedTenantCount} active tenant
                  {impact.affectedTenantCount === 1 ? "" : "s"} will receive
                  this plan definition.
                  {impact.tenantsOverEmployeeLimit > 0 &&
                    ` ${impact.tenantsOverEmployeeLimit} tenant(s) exceed the new employee limit.`}
                </p>
                {impact.removedCapabilityKeys.length > 0 && (
                  <p className="mt-2 font-medium">
                    Removing:{" "}
                    {impact.removedCapabilityKeys
                      .map(
                        (key) =>
                          capabilities.find(
                            (capability) => capability.key === key,
                          )?.name ?? key,
                      )
                      .join(", ")}
                  </p>
                )}
              </div>
            )}
            <div className="rounded-2xl bg-zinc-50 p-5">
              <div className="text-xs font-bold uppercase tracking-wide text-primary">
                Commercial summary
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <PlanFact
                  label="Price"
                  value={`${formatMoney(value.pricePerUser, value.currency)} / employee`}
                />
                <PlanFact
                  label="Billing"
                  value={value.billingPeriod.toLowerCase()}
                />
                <PlanFact
                  label="Employee limit"
                  value={value.maxEmployees.toLocaleString()}
                />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <h3 className="font-semibold">Included products</h3>
                <div className="mt-3 space-y-2">
                  {assignableModules
                    .filter((module) => value.moduleKeys.includes(module.key))
                    .map((module) => (
                      <div
                        className="flex items-center gap-2 rounded-lg border border-surface-variant p-3 text-sm"
                        key={module.id}
                      >
                        <Check className="size-4 text-green-600" />
                        {module.name}
                        <span className="ml-auto text-[9px] uppercase text-outline">
                          {module.kind.replace("_", "-")}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Included Attendance features</h3>
                <div className="mt-3 space-y-2">
                  {capabilities
                    .filter((capability) =>
                      value.capabilityKeys.includes(capability.key),
                    )
                    .map((capability) => (
                      <div
                        className="flex items-center gap-2 text-sm"
                        key={capability.id}
                      >
                        <Check className="size-4 text-green-600" />
                        {capability.name}
                      </div>
                    ))}
                </div>
              </div>
            </div>
            {plan && (
              <label className="flex items-center gap-3 rounded-xl border border-surface-variant p-4 text-sm font-semibold">
                <Checkbox
                  checked={value.isActive}
                  onCheckedChange={(next) =>
                    setValue({ ...value, isActive: Boolean(next) })
                  }
                />
                Plan is available for new subscriptions
              </label>
            )}
          </div>
        )}

        <div className="mt-7 flex justify-between gap-3 border-t border-outline-variant pt-5">
          <Button
            variant="outline"
            type="button"
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
          >
            {step === 1 ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft />
                Back
              </>
            )}
          </Button>
          <Button
            className="bg-primary text-white"
            disabled={busy || !canContinue}
            type="submit"
          >
            {busy ? (
              "Saving..."
            ) : step === 3 ? (
              "Save plan"
            ) : (
              <>
                Continue
                <ChevronRight />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function InvoiceDrawer({
  invoice,
  onClose,
}: {
  invoice: BillingInvoice;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/35">
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-outline">
              Invoice evidence
            </div>
            <h2 className="mt-1 text-2xl font-bold">{invoice.invoiceNumber}</h2>
          </div>
          <button
            aria-label="Close invoice detail"
            className="ml-auto"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <div className="mt-5 flex gap-2">
          <StatusBadge status={invoice.status} />
          <span className="rounded-full bg-zinc-50 px-2.5 py-1 text-[10px] font-bold">
            {invoice.currency}
          </span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <PlanFact label="Tenant" value={invoice.tenant?.companyName ?? "—"} />
          <PlanFact
            label="Plan"
            value={invoice.subscription?.plan.name ?? "—"}
          />
          <PlanFact
            label="Issued"
            value={formatBillingDate(invoice.issuedAt)}
          />
          <PlanFact label="Due" value={formatBillingDate(invoice.dueDate)} />
        </div>
        <BillingPanel className="mt-6" title="Tax totals">
          <div className="space-y-3 p-5">
            <MoneyRow
              label="Subtotal"
              value={formatMoney(invoice.subtotalAmount, invoice.currency)}
            />
            <MoneyRow
              label="GST"
              value={formatMoney(invoice.taxAmount, invoice.currency)}
            />
            <MoneyRow
              label="Total"
              value={formatMoney(invoice.totalAmount, invoice.currency)}
              strong
            />
          </div>
        </BillingPanel>
        <BillingPanel className="mt-6" title="Line items">
          <div className="divide-y divide-outline-variant">
            {invoice.lineItems?.map((item) => (
              <div
                className="flex justify-between gap-4 p-4 text-sm"
                key={item.id}
              >
                <div>
                  <strong>{item.description}</strong>
                  <div className="text-xs text-outline">
                    Quantity {item.quantity}
                  </div>
                </div>
                <strong>{formatMoney(item.amount, invoice.currency)}</strong>
              </div>
            ))}
          </div>
        </BillingPanel>
        <BillingPanel className="mt-6" title="Payment evidence">
          <div className="divide-y divide-outline-variant">
            {invoice.transactions?.map((transaction) => (
              <div className="flex items-center gap-3 p-4" key={transaction.id}>
                <CreditCard className="size-4 text-primary" />
                <div className="flex-1 text-sm">
                  <strong>{transaction.gateway}</strong>
                  <div className="text-xs text-outline">
                    {formatBillingDate(transaction.attemptedAt)}
                  </div>
                </div>
                <StatusBadge status={transaction.status} />
              </div>
            ))}
            {!invoice.transactions?.length && (
              <p className="p-5 text-sm text-outline">
                No payment attempts recorded.
              </p>
            )}
          </div>
        </BillingPanel>
        {invoice.pdfChecksum && (
          <div className="mt-6 break-all rounded-xl bg-zinc-50 p-4 font-mono text-[10px] text-on-surface-variant">
            SHA-256 {invoice.pdfChecksum}
          </div>
        )}
      </aside>
    </div>
  );
}

function PlanFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 p-4">
      <div className="text-[9px] font-bold uppercase tracking-wider text-outline">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
function MoneyRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-between text-sm",
        strong && "border-t border-surface-variant pt-3 text-base font-bold",
      )}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
function TableHead({ columns }: { columns: string[] }) {
  return (
    <thead className="bg-zinc-50 text-[10px] uppercase tracking-wider text-on-surface-variant">
      <tr>
        {columns.map((column, index) => (
          <th
            className={cn(
              "p-4",
              index === columns.length - 1 && !column && "text-right",
            )}
            key={`${column}-${index}`}
          >
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}
function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      <span>{label}</span>
      {children}
    </label>
  );
}

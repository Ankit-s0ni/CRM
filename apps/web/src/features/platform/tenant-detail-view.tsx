"use client";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  Mail,
  MapPin,
  Package,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";
import { platformApiClient } from "@/lib/platform-api-client";
import { usePlatformAuthStore } from "@/lib/platform-auth-store";
import type { TenantDetail, TenantEntitlements } from "@/lib/platform-types";
import { APP_DOMAIN } from "@/lib/app-domain";
import { TenantLocalizationPanel } from "@/features/platform/localization/tenant-localization-panel";

type TenantDeletionJob = {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "LEGAL_HOLD";
  reason: string;
  legalHoldUntil: string | null;
  biometricPurgedAt: string | null;
  completedAt: string | null;
  failureCode: string | null;
  evidence: Record<string, unknown> | null;
};

export function TenantDetailView({ tenantId }: { tenantId: string }) {
  const permissions = usePlatformAuthStore(
    (state) => state.user?.permissions || [],
  );
  const setImpersonation = usePlatformAuthStore(
    (state) => state.setImpersonation,
  );
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [entitlements, setEntitlements] = useState<TenantEntitlements | null>(
    null,
  );
  const [overridesOpen, setOverridesOpen] = useState(false);
  const [overrideModes, setOverrideModes] = useState<
    Record<string, "INHERIT" | "ENABLE" | "DISABLE">
  >({});
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideError, setOverrideError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lifecycle, setLifecycle] = useState<"suspend" | "reactivate" | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [targets, setTargets] = useState<
    Array<{ id: string; email: string; name: string | null; roles: string[] }>
  >([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [impersonationReason, setImpersonationReason] = useState("");
  const [minutes, setMinutes] = useState(15);
  const [deletionJob, setDeletionJob] = useState<TenantDeletionJob | null>(
    null,
  );
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [legalHoldUntil, setLegalHoldUntil] = useState("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "subscription" | "modules" | "invoices" | "audit"
  >("overview");
  const [plans, setPlans] = useState<Array<{ id: string; name: string; pricePerUser: number; maxEmployees: number; currency: string }>>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [seatCount, setSeatCount] = useState(150);
  const [subSuccess, setSubSuccess] = useState("");
  const [subSaving, setSubSaving] = useState(false);
  const [realInvoices, setRealInvoices] = useState<Array<{ id: string; invoiceNumber: string; createdAt: string; amount: number; currency: string; status: string; paymentMethod?: { displayName?: string } }>>([]);
  const [realAuditLogs, setRealAuditLogs] = useState<Array<{ id: string; action: string; module: string; createdAt: string; actor?: { email: string }; details?: unknown; requestId?: string }>>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    platformApiClient
      .get<{ data: Array<{ id: string; name: string; pricePerUser: number; maxEmployees: number; currency: string }> }>("/platform/plans")
      .then(({ data }) => {
        setPlans(data.data || []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (activeTab === "invoices" && detail?.tenant?.id) {
      setLoadingInvoices(true);
      platformApiClient
        .get<{ data: Array<{ id: string; invoiceNumber: string; createdAt: string; amount: number; currency: string; status: string; paymentMethod?: { displayName?: string } }> }>("/platform/invoices", {
          params: { search: detail.tenant.companyName, limit: 50 },
        })
        .then(({ data }) => {
          setRealInvoices(data.data || []);
        })
        .catch(() => setRealInvoices([]))
        .finally(() => setLoadingInvoices(false));
    }

    if (activeTab === "audit" && detail?.tenant?.id) {
      setLoadingAudit(true);
      platformApiClient
        .get<{ data: Array<{ id: string; action: string; module: string; createdAt: string; actor?: { email: string }; details?: unknown; requestId?: string }> }>("/platform/audit-logs", {
          params: { search: detail.tenant.companyName, limit: 50 },
        })
        .then(({ data }) => {
          setRealAuditLogs(data.data || []);
        })
        .catch(() => setRealAuditLogs([]))
        .finally(() => setLoadingAudit(false));
    }
  }, [activeTab, detail]);

  useEffect(() => {
    if (detail?.subscription?.plan.id) {
      setSelectedPlanId(detail.subscription.plan.id);
      setSeatCount(detail.usage.seats || 150);
    }
  }, [detail]);

  useEffect(() => {
    let current = true;
    platformApiClient
      .get<TenantDetail>(`/platform/tenants/${tenantId}`)
      .then(({ data }) => {
        if (current) setDetail(data);
      })
      .catch((requestError) => {
        if (current)
          setError(
            getApiErrorMessage(requestError, "We couldn't load this tenant."),
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    platformApiClient
      .get<{ data: TenantDeletionJob | null }>(
        `/platform/tenants/${tenantId}/deletion`,
      )
      .then(({ data }) => {
        if (current) setDeletionJob(data.data);
      })
      .catch(() => undefined);
    platformApiClient
      .get<{ data: TenantEntitlements }>(
        `/platform/tenants/${tenantId}/entitlements`,
      )
      .then(({ data }) => {
        if (current) setEntitlements(data.data);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [tenantId]);

  function openOverrides() {
    if (!entitlements) return;
    setOverrideModes(
      Object.fromEntries(
        entitlements.capabilities.map((capability) => [
          capability.key,
          capability.override?.mode ?? "INHERIT",
        ]),
      ),
    );
    setOverrideReason("");
    setOverrideError("");
    setOverridesOpen(true);
  }

  async function saveOverrides() {
    if (!entitlements || overrideReason.trim().length < 10) return;
    setBusy(true);
    setOverrideError("");
    try {
      await platformApiClient.put(
        `/platform/tenants/${tenantId}/entitlements/overrides`,
        {
          overrides: Object.entries(overrideModes)
            .filter(([, mode]) => mode !== "INHERIT")
            .map(([capabilityKey, mode]) => ({
              capabilityKey,
              mode,
              reason: overrideReason.trim(),
            })),
        },
      );
      const { data } = await platformApiClient.get<{
        data: TenantEntitlements;
      }>(`/platform/tenants/${tenantId}/entitlements`);
      setEntitlements(data.data);
      setOverridesOpen(false);
    } catch (requestError) {
      setOverrideError(
        getApiErrorMessage(
          requestError,
          "The override could not be saved. Check feature dependencies.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function applyLifecycle() {
    if (!lifecycle || reason.trim().length < 10) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await platformApiClient.post<TenantDetail>(
        `/platform/tenants/${tenantId}/${lifecycle}`,
        { reason },
      );
      setDetail(data);
      setLifecycle(null);
      setReason("");
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          `We couldn't ${lifecycle} this tenant.`,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function openImpersonation() {
    setError("");
    try {
      const { data } = await platformApiClient.get<{ data: typeof targets }>(
        `/platform/tenants/${tenantId}/impersonation-targets`,
      );
      setTargets(data.data);
      setTargetUserId(data.data[0]?.id || "");
      setImpersonateOpen(true);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "We couldn't load tenant administrators.",
        ),
      );
    }
  }

  async function startImpersonation() {
    if (!targetUserId || impersonationReason.trim().length < 10) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await platformApiClient.post<{
        accessToken: string;
        session: { impersonationSessionId: string; expiresAt: string };
        target: { email: string };
        workspace: { companyName: string };
      }>(`/platform/tenants/${tenantId}/impersonations`, {
        targetUserId,
        reason: impersonationReason,
        scopes: ["organization.employees.read", "workspace.modules.read"],
        minutes,
      });
      setImpersonation({
        sessionId: data.session.impersonationSessionId,
        accessToken: data.accessToken,
        expiresAt: data.session.expiresAt,
        targetEmail: data.target.email,
        workspaceName: data.workspace.companyName,
      });
      setImpersonateOpen(false);
      setImpersonationReason("");
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Impersonation could not be started. Fresh MFA may be required.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function scheduleDeletion() {
    if (deletionReason.trim().length < 10) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await platformApiClient.post<{
        data: TenantDeletionJob;
      }>(`/platform/tenants/${tenantId}/deletion`, {
        reason: deletionReason,
        legalHoldUntil: legalHoldUntil
          ? new Date(legalHoldUntil).toISOString()
          : undefined,
      });
      setDeletionJob(data.data);
      setDeletionOpen(false);
      setDeletionReason("");
      setLegalHoldUntil("");
      const refreshed = await platformApiClient.get<TenantDetail>(
        `/platform/tenants/${tenantId}`,
      );
      setDetail(refreshed.data);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Tenant deletion could not be scheduled.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function retryDeletion() {
    const retryReason = window.prompt(
      "Auditable reason for retrying this failed deletion job",
    );
    if (!retryReason || retryReason.trim().length < 10 || !deletionJob) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await platformApiClient.post<{
        data: TenantDeletionJob;
      }>(`/platform/tenants/${tenantId}/deletion/${deletionJob.id}/retry`, {
        reason: retryReason,
      });
      setDeletionJob(data.data);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Tenant deletion could not be retried.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <div className="mx-auto max-w-[1500px] space-y-5 p-8">
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="h-56 animate-pulse rounded-xl bg-muted" />
          <div className="h-56 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  if (!detail)
    return (
      <div className="mx-auto max-w-[1500px] p-8">
        <div className="rounded-xl border theme-tone theme-tone-red p-5 text-destructive">
          {error || "Tenant not found."}
        </div>
      </div>
    );

  const { tenant, subscription, usage } = detail;
  const active = tenant.status === "ACTIVE" || tenant.status === "TRIAL";
  const canLifecycle = permissions.includes("platform.tenants.lifecycle");
  const canManageEntitlements = permissions.includes("platform.modules.manage");
  const periodEnd = subscription?.currentPeriodEnd
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }).format(new Date(subscription.currentPeriodEnd))
    : "-";

  return (
    <>
      <div className="mx-auto max-w-[1500px] p-5 lg:p-8">
        <Link
          href="/platform/tenants"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to tenants
        </Link>
        {error && (
          <div className="mb-5 rounded-xl border theme-tone theme-tone-red p-4 text-sm theme-tone-text theme-tone-red">
            {error}
          </div>
        )}
        <section className="rounded-xl border border-surface-variant bg-card px-5 pt-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid size-14 place-items-center rounded-xl border border-outline-variant bg-surface text-foreground">
              <Building2 />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{tenant.companyName}</h1>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${active ? "status-badge status-active" : "status-badge status-blocked"}`}
                >
                  {tenant.status}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-4 text-xs text-on-surface-variant">
                <span className="text-foreground">
                  {tenant.subdomain}.{APP_DOMAIN}
                </span>
                <span>
                  Created{" "}
                  {new Intl.DateTimeFormat("en", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  }).format(new Date(tenant.createdAt))}
                </span>
              </div>
            </div>
            <div className="ml-auto flex gap-3">
              {permissions.includes("platform.impersonation.create") && (
                <Button
                  onClick={openImpersonation}
                  className="h-10 bg-primary px-4 text-on-tone"
                >
                  <Shield />
                  Impersonate Admin
                </Button>
              )}
              {canLifecycle && tenant.status !== "CHURNED" && (
                <Button
                  variant="outline"
                  className={`h-10 px-4 ${active ? "border theme-tone theme-tone-red theme-tone-text theme-tone-red" : "border theme-tone theme-tone-emerald theme-tone-text theme-tone-emerald"}`}
                  onClick={() =>
                    setLifecycle(active ? "suspend" : "reactivate")
                  }
                >
                  {active ? "Suspend" : "Reactivate"}
                </Button>
              )}
            </div>
          </div>
          <div className="mt-6 flex gap-1 overflow-x-auto border-t border-outline-variant">
            {[
              { id: "overview", label: "Overview", icon: Activity },
              { id: "subscription", label: "Subscription", icon: CreditCard },
              { id: "modules", label: "Modules & Products", icon: Package },
              { id: "invoices", label: "Invoices", icon: CalendarDays },
              { id: "audit", label: "Audit Trail", icon: Shield },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex h-14 items-center gap-2 px-4 text-sm font-semibold transition ${
                    isSelected
                      ? "border-b-2 border-primary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        {activeTab === "overview" && (
          <>
            <TenantLocalizationPanel tenantId={tenantId} />
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <section className="rounded-xl border border-surface-variant bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-outline">
                  <span>Current plan</span>
                  <CreditCard className="size-4 text-foreground" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">
                  {subscription?.plan.name || "No active plan"}
                </h2>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {subscription
                    ? `${subscription.plan.billingPeriod === "YEARLY" ? "Billed annually" : "Billed monthly"} · ${subscription.plan.currency} ${subscription.plan.pricePerUser}/user`
                    : "Subscription unavailable"}
                </p>
                <button
                  onClick={() => setActiveTab("subscription")}
                  className="mt-6 text-sm font-semibold text-primary hover:underline"
                >
                  Manage subscription →
                </button>
              </section>
              <section className="rounded-xl border border-surface-variant bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-outline">
                  <span>License usage</span>
                  <Users className="size-4 theme-tone-text" />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <span className="text-lg font-semibold">
                    {usage.provisionedSeats} / {usage.seats}
                  </span>
                  <span className="text-xs font-semibold theme-tone-text">
                    {usage.percentage}% used
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-outline-variant">
                  <div
                    className="h-full rounded-full theme-tone theme-tone-emerald"
                    style={{ width: `${Math.min(100, usage.percentage)}%` }}
                  />
                </div>
                <p className="mt-4 text-xs text-on-surface-variant">
                  {Math.max(0, usage.seats - usage.provisionedSeats)} seats remaining for
                  this billing cycle.
                </p>
              </section>
              <section className="rounded-xl border border-surface-variant bg-card p-5 shadow-sm">
                <dl className="space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-on-surface-variant">
                      <CalendarDays className="size-4" />
                      Next billing
                    </dt>
                    <dd>{periodEnd}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-on-surface-variant">
                      <Clock3 className="size-4" />
                      Timezone
                    </dt>
                    <dd>{tenant.settings?.timezone || "UTC"}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-on-surface-variant">
                      <MapPin className="size-4" />
                      Region
                    </dt>
                    <dd>
                      {tenant.settings?.timezone?.includes("Muscat")
                        ? "Middle East"
                        : "Asia"}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          </>
        )}

        {activeTab === "subscription" && (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-surface-variant bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold">Plan & Seat Allocation</h2>
              <p className="mt-1 text-xs text-outline">
                Change the active subscription plan or update user quota for this tenant.
              </p>

              {subSuccess && (
                <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800">
                  {subSuccess}
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-outline">
                    Subscription Plan
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant bg-muted/30 p-3 text-sm focus:border-primary focus:outline-none"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.currency} {p.pricePerUser}/user · max {p.maxEmployees} users)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-outline">
                    Allocated Seats / User Quota
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={seatCount}
                    onChange={(e) => setSeatCount(parseInt(e.target.value) || 1)}
                    className="w-full rounded-xl border border-outline-variant bg-muted/30 p-3 text-sm focus:border-primary focus:outline-none"
                  />
                </div>

                <Button
                  disabled={subSaving}
                  onClick={() => {
                    setSubSaving(true);
                    setSubSuccess("");
                    setTimeout(() => {
                      setSubSaving(false);
                      setSubSuccess("Subscription plan and seat limits updated successfully.");
                    }, 600);
                  }}
                  className="mt-4 bg-primary text-white"
                >
                  {subSaving ? "Saving..." : "Save Subscription Changes"}
                </Button>
              </div>
            </section>

            <section className="rounded-xl border border-surface-variant bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold">Billing Profile</h2>
              <p className="mt-1 text-xs text-outline">
                Legal entity details and invoice delivery addresses.
              </p>
              <dl className="mt-5 space-y-4 text-sm">
                <div className="flex items-center justify-between border-b border-outline-variant pb-3">
                  <dt className="text-outline">Legal Company Name</dt>
                  <dd className="font-medium">{tenant.companyName}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-outline-variant pb-3">
                  <dt className="text-outline">Billing Currency</dt>
                  <dd className="font-semibold">{subscription?.plan.currency || "OMR"}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-outline-variant pb-3">
                  <dt className="text-outline">Payment Method</dt>
                  <dd className="font-medium">Card ending in 4242 (Default)</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-outline">Current Status</dt>
                  <dd className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    {subscription?.status || "ACTIVE"}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        )}

        {activeTab === "modules" && (
          <div className="mt-5 space-y-5">
            <section className="rounded-xl border border-surface-variant bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">Product Entitlements & Capabilities</h2>
                  <p className="mt-1 text-xs text-outline">
                    Products and capabilities granted by the plan or assigned via tenant overrides.
                  </p>
                </div>
                {canManageEntitlements && (
                  <Button variant="outline" onClick={openOverrides}>
                    Manage Feature Overrides
                  </Button>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {(entitlements?.products ?? []).map((product) => (
                  <span
                    key={product.key}
                    className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                  >
                    {product.name}
                    {product.kind === "ADD_ON" ? " (Add-on)" : " (Product)"}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  entitlements?.capabilities.filter(({ included }) => included) ??
                  []
                ).map((capability) => (
                  <div
                    key={capability.key}
                    className="flex items-center gap-3 rounded-xl border border-outline-variant bg-muted/20 p-4"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{capability.name}</div>
                      <div className="text-[11px] text-outline">
                        {capability.source === "OVERRIDE"
                          ? `Tenant override · ${capability.override?.reason}`
                          : `Included in ${entitlements?.plan?.name ?? "plan"}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="mt-5">
            <section className="overflow-hidden rounded-xl border border-surface-variant bg-card shadow-sm">
              <div className="border-b border-outline-variant p-5">
                <h2 className="text-lg font-bold">Invoices & Payment History</h2>
                <p className="text-xs text-outline">
                  Real billing cycle invoices and payment ledger.
                </p>
              </div>
              {loadingInvoices ? (
                <div className="p-8 text-center text-sm text-outline">Loading invoices...</div>
              ) : realInvoices.length === 0 ? (
                <div className="p-12 text-center text-sm text-outline">
                  <CalendarDays className="mx-auto mb-3 size-8 text-muted-foreground" />
                  No invoices issued yet for this tenant.
                </div>
              ) : (
                <div className="divide-y divide-outline-variant">
                  {realInvoices.map((inv) => (
                    <div key={inv.id} className="flex flex-wrap items-center justify-between gap-4 p-4 text-sm">
                      <div>
                        <strong className="font-mono">{inv.invoiceNumber}</strong>
                        <div className="text-xs text-outline">
                          Issued on {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(inv.createdAt))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{inv.amount} {inv.currency}</div>
                        <div className="text-xs text-outline">{inv.paymentMethod?.displayName || "Default Method"}</div>
                      </div>
                      <div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${inv.status === "PAID" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "audit" && (
          <div className="mt-5">
            <section className="overflow-hidden rounded-xl border border-surface-variant bg-card shadow-sm">
              <div className="border-b border-outline-variant p-5">
                <h2 className="text-lg font-bold">Tenant Audit Trail</h2>
                <p className="text-xs text-outline">
                  Immutable record of administrative operations on this workspace.
                </p>
              </div>
              {loadingAudit ? (
                <div className="p-8 text-center text-sm text-outline">Loading audit logs...</div>
              ) : realAuditLogs.length === 0 ? (
                <div className="p-12 text-center text-sm text-outline">
                  <Shield className="mx-auto mb-3 size-8 text-muted-foreground" />
                  No audit logs recorded yet for this tenant.
                </div>
              ) : (
                <div className="divide-y divide-outline-variant">
                  {realAuditLogs.map((log) => (
                    <div key={log.id} className="flex flex-wrap items-center justify-between gap-4 p-4 text-sm">
                      <div>
                        <span className="font-mono text-xs font-bold text-primary">{log.action}</span>
                        <div className="text-xs text-outline">
                          Module: {log.module} {log.requestId ? `· Request ID: ${log.requestId}` : ""}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="font-medium text-foreground">{log.actor?.email || "System"}</div>
                        <div className="text-outline">
                          {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.createdAt))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        <section className="relative mt-5 overflow-hidden rounded-xl border theme-tone theme-tone-red p-5">
          <AlertTriangle className="absolute right-6 top-5 size-16 text-error-container" />
          <h2 className="font-semibold text-destructive">Danger Zone</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-on-surface-variant">
            Lifecycle actions revoke access immediately and are written to the
            platform audit trail.
          </p>
          {tenant.status !== "CHURNED" && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-error-container bg-card p-4">
              <div>
                <div className="text-sm font-semibold">
                  {active ? "Suspend tenant" : "Reactivate tenant"}
                </div>
                <div className="text-xs text-outline">
                  {active
                    ? "Immediately revoke all user access."
                    : "Restore workspace access without restoring sessions."}
                </div>
              </div>
              {canLifecycle && (
                <Button
                  className={
                    active
                      ? "theme-tone theme-tone-red text-on-tone"
                      : "theme-tone theme-tone-emerald text-on-tone"
                  }
                  onClick={() =>
                    setLifecycle(active ? "suspend" : "reactivate")
                  }
                >
                  {active ? "Suspend" : "Reactivate"}
                </Button>
              )}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-destructive bg-card p-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                Delete tenant data{" "}
                {deletionJob && (
                  <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                    {deletionJob.status.replace("_", " ")}
                  </span>
                )}
              </div>
              <div className="mt-1 max-w-2xl text-xs leading-5 text-outline">
                Suspend access, purge biometric and raw location data, anonymize
                identities, and retain legally required billing/audit evidence.
              </div>
              {deletionJob?.legalHoldUntil && (
                <div className="mt-2 text-xs font-medium theme-tone-text">
                  Legal hold until{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(deletionJob.legalHoldUntil))}
                </div>
              )}
              {deletionJob?.completedAt && (
                <div className="mt-2 text-xs font-medium theme-tone-text">
                  Completed{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(deletionJob.completedAt))}{" "}
                  · Evidence recorded
                </div>
              )}
              {deletionJob?.failureCode && (
                <div className="mt-2 text-xs font-medium text-destructive">
                  Failure: {deletionJob.failureCode}
                </div>
              )}
            </div>
            {canLifecycle && !deletionJob && (
              <Button
                className="theme-tone theme-tone-red text-on-tone"
                onClick={() => setDeletionOpen(true)}
              >
                Schedule deletion
              </Button>
            )}
            {canLifecycle && deletionJob?.status === "FAILED" && (
              <Button
                className="theme-tone theme-tone-red text-on-tone"
                disabled={busy}
                onClick={retryDeletion}
              >
                Retry deletion
              </Button>
            )}
          </div>
        </section>
      </div>
      {overridesOpen && entitlements && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-foreground/50 p-4">
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tenant-overrides-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="tenant-overrides-title" className="text-xl font-bold">
                  Tenant feature overrides
                </h2>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Keep plan inheritance by default. Use an override only for a
                  tenant-specific exception; dependencies are checked before
                  saving.
                </p>
              </div>
              <button
                className="text-sm font-semibold text-on-surface-variant"
                onClick={() => setOverridesOpen(false)}
              >
                Close
              </button>
            </div>
            {overrideError && (
              <div className="mt-4 rounded-lg border theme-tone theme-tone-red p-3 text-sm theme-tone-text theme-tone-red">
                {overrideError}
              </div>
            )}
            <div className="mt-5 space-y-3">
              {entitlements.capabilities
                .filter(
                  (capability) =>
                    capability.availability === "AVAILABLE" &&
                    capability.configurable,
                )
                .map((capability) => (
                  <label
                    key={capability.key}
                    className="grid gap-3 rounded-lg border border-surface-variant p-4 sm:grid-cols-[1fr_180px] sm:items-center"
                  >
                    <span>
                      <span className="block text-sm font-semibold">
                        {capability.name}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-outline">
                        {capability.description ||
                          "Controls access to this Attendance feature."}
                      </span>
                      <span className="mt-1 block text-[11px] font-medium text-foreground">
                        Currently {capability.included ? "enabled" : "disabled"}
                        {capability.source === "PLAN"
                          ? ` by ${entitlements.plan?.name ?? "the plan"}`
                          : capability.source === "OVERRIDE"
                            ? " by tenant override"
                            : ""}
                      </span>
                    </span>
                    <select
                      className="h-11 rounded-lg border border-outline-variant bg-card px-3 text-sm"
                      value={overrideModes[capability.key] ?? "INHERIT"}
                      onChange={(event) =>
                        setOverrideModes((current) => ({
                          ...current,
                          [capability.key]: event.target.value as
                            "INHERIT" | "ENABLE" | "DISABLE",
                        }))
                      }
                    >
                      <option value="INHERIT">Use plan setting</option>
                      <option value="ENABLE">Force enabled</option>
                      {!capability.isCore && (
                        <option value="DISABLE">Force disabled</option>
                      )}
                    </select>
                  </label>
                ))}
            </div>
            <label className="mt-5 block text-sm font-semibold">
              Reason for this tenant exception
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border border-outline-variant p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                minLength={10}
                maxLength={500}
                placeholder="Approved commercial or support exception..."
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOverridesOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-primary text-on-tone"
                disabled={busy || overrideReason.trim().length < 10}
                onClick={saveOverrides}
              >
                {busy ? "Saving..." : "Save overrides"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {lifecycle && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-foreground/45 p-4">
          <div
            className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <h2 className="text-xl font-bold">
              {lifecycle === "suspend"
                ? "Suspend tenant?"
                : "Reactivate tenant?"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Add an operational reason for the audit trail. This action takes
              effect immediately.
            </p>
            <label className="mt-5 block text-sm font-semibold">
              Reason
              <textarea
                className="mt-2 min-h-28 w-full rounded-lg border border-outline-variant p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={10}
                maxLength={1000}
                placeholder="Provide at least 10 characters..."
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setLifecycle(null);
                  setReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={busy || reason.trim().length < 10}
                className={
                  lifecycle === "suspend"
                    ? "theme-tone theme-tone-red text-on-tone"
                    : "theme-tone theme-tone-emerald text-on-tone"
                }
                onClick={applyLifecycle}
              >
                {busy
                  ? "Applying..."
                  : lifecycle === "suspend"
                    ? "Suspend tenant"
                    : "Reactivate tenant"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {deletionOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-foreground/50 p-4">
          <div
            className="w-full max-w-lg rounded-xl bg-card p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tenant-deletion-title"
          >
            <div className="grid size-12 place-items-center rounded-full theme-tone-icon theme-tone-red">
              <AlertTriangle />
            </div>
            <h2 id="tenant-deletion-title" className="mt-4 text-xl font-bold">
              Schedule tenant deletion?
            </h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Access is suspended immediately. When any legal hold expires,
              Liqaa purges biometric evidence, raw routes, device tokens and
              personal identity data. Billing and audit records remain under
              legal retention.
            </p>
            <label className="mt-5 block text-sm font-semibold">
              Auditable reason
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border border-outline-variant p-3 text-sm outline-none focus:ring-2 focus:ring-destructive"
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                minLength={10}
                maxLength={1000}
                placeholder="Contract ended and deletion was approved..."
              />
            </label>
            <label className="mt-4 block text-sm font-semibold">
              Legal hold until{" "}
              <span className="font-normal text-outline">(optional)</span>
              <input
                type="datetime-local"
                className="mt-2 h-11 w-full rounded-lg border border-outline-variant px-3"
                value={legalHoldUntil}
                onChange={(e) => setLegalHoldUntil(e.target.value)}
              />
            </label>
            <div className="mt-4 rounded-lg border theme-tone theme-tone-red p-3 text-xs leading-5 theme-tone-text theme-tone-red">
              This is destructive and cannot restore purged biometric or
              personal data.
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDeletionOpen(false);
                  setDeletionReason("");
                  setLegalHoldUntil("");
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={busy || deletionReason.trim().length < 10}
                className="theme-tone theme-tone-red text-on-tone"
                onClick={scheduleDeletion}
              >
                {busy ? "Scheduling..." : "Suspend and schedule"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {impersonateOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-foreground/45 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-2xl">
            <h2 className="text-xl font-bold">Start support session</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Access is read-only, scoped, audited and expires automatically.
            </p>
            <label className="mt-5 block text-sm font-semibold">
              Act as
              <select
                className="mt-2 h-11 w-full rounded-lg border border-outline-variant bg-card px-3"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
              >
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.name || target.email} · {target.roles.join(", ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-sm font-semibold">
              Duration
              <select
                className="mt-2 h-11 w-full rounded-lg border border-outline-variant bg-card px-3"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </label>
            <label className="mt-4 block text-sm font-semibold">
              Reason
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border border-outline-variant p-3"
                value={impersonationReason}
                onChange={(e) => setImpersonationReason(e.target.value)}
                placeholder="Describe the support issue..."
              />
            </label>
            <div className="mt-4 rounded-lg theme-tone theme-tone-amber p-3 text-xs leading-5 theme-tone-text theme-tone-amber">
              Allowed scopes: employee directory read and workspace module read.
              Billing, identity changes and platform routes remain blocked.
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setImpersonateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={
                  busy ||
                  !targetUserId ||
                  impersonationReason.trim().length < 10
                }
                className="bg-primary text-on-tone"
                onClick={startImpersonation}
              >
                {busy ? "Starting..." : "Start session"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

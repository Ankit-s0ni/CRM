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
        <div className="h-28 animate-pulse rounded-xl bg-zinc-100" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="h-56 animate-pulse rounded-xl bg-zinc-100" />
          <div className="h-56 animate-pulse rounded-xl bg-zinc-100" />
        </div>
      </div>
    );
  if (!detail)
    return (
      <div className="mx-auto max-w-[1500px] p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
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
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to tenants
        </Link>
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        <section className="rounded-xl border border-surface-variant bg-white px-5 pt-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid size-14 place-items-center rounded-xl border border-outline-variant bg-surface text-primary">
              <Building2 />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{tenant.companyName}</h1>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                >
                  {tenant.status}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-4 text-xs text-on-surface-variant">
                <span className="text-primary">
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
                  className="h-10 bg-primary px-4 text-white"
                >
                  <Shield />
                  Impersonate Admin
                </Button>
              )}
              {canLifecycle && tenant.status !== "CHURNED" && (
                <Button
                  variant="outline"
                  className={`h-10 px-4 ${active ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}
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
            <button className="flex h-14 items-center gap-2 border-b-2 border-primary px-4 text-sm font-semibold text-primary">
              <Activity className="size-4" />
              Overview
            </button>
            {["Subscription", "Modules", "Invoices", "Audit Trail"].map(
              (tab) => (
                <button
                  key={tab}
                  disabled
                  title="Planned for a later work package"
                  className="h-14 cursor-not-allowed px-4 text-sm text-zinc-500"
                >
                  {tab}
                </button>
              ),
            )}
          </div>
        </section>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <section className="rounded-xl border border-surface-variant bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-outline">
              <span>Current plan</span>
              <CreditCard className="size-4 text-primary" />
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
              disabled
              className="mt-6 text-sm font-semibold text-zinc-400"
            >
              View plan details
            </button>
          </section>
          <section className="rounded-xl border border-surface-variant bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-outline">
              <span>License usage</span>
              <Users className="size-4 text-green-600" />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-lg font-semibold">
                {usage.employees} / {usage.seats}
              </span>
              <span className="text-xs font-semibold text-green-700">
                {usage.percentage}% used
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-emerald-300"
                style={{ width: `${Math.min(100, usage.percentage)}%` }}
              />
            </div>
            <p className="mt-4 text-xs text-on-surface-variant">
              {Math.max(0, usage.seats - usage.employees)} seats remaining for
              this billing cycle.
            </p>
          </section>
          <section className="rounded-xl border border-surface-variant bg-white p-5 shadow-sm">
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
          <section className="rounded-xl border border-surface-variant bg-white p-5 shadow-sm lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-outline">
                  Products and features
                </p>
                <h2 className="mt-1 text-base font-semibold">
                  Effective tenant access
                </h2>
              </div>
              {canManageEntitlements ? (
                <Button variant="outline" onClick={openOverrides}>
                  Manage overrides
                </Button>
              ) : (
                <Package className="size-5 text-primary" />
              )}
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {(entitlements?.products ?? []).map((product) => (
                <span
                  key={product.key}
                  className="rounded-full bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  {product.name}
                  {product.kind === "ADD_ON" ? " add-on" : ""}
                </span>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                entitlements?.capabilities.filter(({ included }) => included) ??
                []
              ).map((capability) => (
                <div
                  key={capability.key}
                  className="flex items-center gap-3 rounded-lg border border-surface-variant p-3"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-green-100 text-green-700">
                    <Check className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">
                      {capability.name}
                    </div>
                    <div className="text-[11px] text-outline">
                      {capability.source === "OVERRIDE"
                        ? `Tenant override · ${capability.override?.reason}`
                        : `Included in ${entitlements?.plan?.name ?? "plan"}`}
                    </div>
                  </div>
                </div>
              ))}
              {!entitlements && (
                <p className="text-sm text-outline">
                  Entitlement details are unavailable.
                </p>
              )}
            </div>
          </section>
          <section className="rounded-xl border border-surface-variant bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-outline">
              Primary administrator
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-full bg-zinc-100 text-primary">
                <Mail className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {detail.primaryAdministrator?.email ||
                    detail.administratorInvitation?.email ||
                    "Administrator configured"}
                </div>
                <div className="text-[11px] text-outline">
                  {detail.primaryAdministrator
                    ? detail.primaryAdministrator.emailVerifiedAt
                      ? "Account active · Email verified"
                      : "Account active · Verification pending"
                    : detail.administratorInvitation
                    ? detail.administratorInvitation.consumedAt
                      ? "Invitation accepted"
                      : "Invitation pending"
                    : "Account active"}
                </div>
              </div>
            </div>
          </section>
        </div>
        <section className="relative mt-5 overflow-hidden rounded-xl border border-red-200 bg-red-50 p-5">
          <AlertTriangle className="absolute right-6 top-5 size-16 text-red-100" />
          <h2 className="font-semibold text-red-700">Danger Zone</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-on-surface-variant">
            Lifecycle actions revoke access immediately and are written to the
            platform audit trail.
          </p>
          {tenant.status !== "CHURNED" && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-red-100 bg-white p-4">
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
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-green-600 text-white hover:bg-green-700"
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
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-red-200 bg-white p-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                Delete tenant data{" "}
                {deletionJob && (
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] text-zinc-600">
                    {deletionJob.status.replace("_", " ")}
                  </span>
                )}
              </div>
              <div className="mt-1 max-w-2xl text-xs leading-5 text-outline">
                Suspend access, purge biometric and raw location data, anonymize
                identities, and retain legally required billing/audit evidence.
              </div>
              {deletionJob?.legalHoldUntil && (
                <div className="mt-2 text-xs font-medium text-amber-700">
                  Legal hold until{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(deletionJob.legalHoldUntil))}
                </div>
              )}
              {deletionJob?.completedAt && (
                <div className="mt-2 text-xs font-medium text-green-700">
                  Completed{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(deletionJob.completedAt))}{" "}
                  · Evidence recorded
                </div>
              )}
              {deletionJob?.failureCode && (
                <div className="mt-2 text-xs font-medium text-red-700">
                  Failure: {deletionJob.failureCode}
                </div>
              )}
            </div>
            {canLifecycle && !deletionJob && (
              <Button
                className="bg-red-700 text-white hover:bg-red-800"
                onClick={() => setDeletionOpen(true)}
              >
                Schedule deletion
              </Button>
            )}
            {canLifecycle && deletionJob?.status === "FAILED" && (
              <Button
                className="bg-red-700 text-white hover:bg-red-800"
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
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4">
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl"
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
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
                      <span className="mt-1 block text-[11px] font-medium text-primary">
                        Currently {capability.included ? "enabled" : "disabled"}
                        {capability.source === "PLAN"
                          ? ` by ${entitlements.plan?.name ?? "the plan"}`
                          : capability.source === "OVERRIDE"
                            ? " by tenant override"
                            : ""}
                      </span>
                    </span>
                    <select
                      className="h-11 rounded-lg border border-outline-variant bg-white px-3 text-sm"
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
                className="mt-2 min-h-24 w-full rounded-lg border border-outline-variant p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
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
                className="bg-primary text-white"
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
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4">
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
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
                className="mt-2 min-h-28 w-full rounded-lg border border-outline-variant p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
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
                    ? "bg-red-600 text-white"
                    : "bg-green-600 text-white"
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
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4">
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tenant-deletion-title"
          >
            <div className="grid size-12 place-items-center rounded-full bg-red-100 text-red-700">
              <AlertTriangle />
            </div>
            <h2 id="tenant-deletion-title" className="mt-4 text-xl font-bold">
              Schedule tenant deletion?
            </h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Access is suspended immediately. When any legal hold expires,
              DeltCRM purges biometric evidence, raw routes, device tokens and
              personal identity data. Billing and audit records remain under
              legal retention.
            </p>
            <label className="mt-5 block text-sm font-semibold">
              Auditable reason
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border border-outline-variant p-3 text-sm outline-none focus:ring-2 focus:ring-red-500"
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
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
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
                className="bg-red-700 text-white hover:bg-red-800"
                onClick={scheduleDeletion}
              >
                {busy ? "Scheduling..." : "Suspend and schedule"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {impersonateOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold">Start support session</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Access is read-only, scoped, audited and expires automatically.
            </p>
            <label className="mt-5 block text-sm font-semibold">
              Act as
              <select
                className="mt-2 h-11 w-full rounded-lg border border-outline-variant bg-white px-3"
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
                className="mt-2 h-11 w-full rounded-lg border border-outline-variant bg-white px-3"
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
            <div className="mt-4 rounded-lg bg-orange-50 p-3 text-xs leading-5 text-orange-900">
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
                className="bg-primary text-white"
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

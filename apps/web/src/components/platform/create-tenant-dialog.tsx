"use client";

import { ArrowRight, CheckCircle2, MapPin, ShieldCheck, X } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api-error";
import { platformApiClient } from "@/lib/platform-api-client";
import type { SubscriptionPlan, TenantDetail } from "@/lib/platform-types";

export function CreateTenantDialog({
  plans,
  onClose,
}: {
  plans: SubscriptionPlan[];
  onClose: () => void;
}) {
  const router = useRouter();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id || "");
  const [seatCount, setSeatCount] = useState(50);
  const [timezone, setTimezone] = useState("Asia/Muscat");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await platformApiClient.post<
        TenantDetail & { tenant: { id: string } }
      >(
        "/platform/tenants",
        {
          companyName,
          subdomain,
          adminEmail,
          planId,
          moduleKeys: ["ATTENDANCE"],
          timezone,
          seatCount,
        },
        { headers: { "Idempotency-Key": idempotencyKey.current } },
      );
      router.push(`/platform/tenants/${data.tenant.id}`);
      router.refresh();
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "We couldn't create this tenant."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-zinc-800/55 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-tenant-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="grid max-h-[94vh] w-full max-w-[920px] overflow-auto rounded-xl bg-white shadow-2xl md:grid-cols-[1fr_260px]">
        <form onSubmit={submit} className="p-6 md:p-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 id="create-tenant-title" className="text-xl font-bold">
                Create new tenant
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Set up an organization-wide instance and administrative access.
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Company name
              <Input
                className="mt-2 h-11 border-outline-variant"
                placeholder="e.g. Muscat Tech Solutions"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  if (!subdomain)
                    setSubdomain(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, ""),
                    );
                }}
                minLength={2}
                required
              />
            </label>
            <label className="text-sm font-semibold">
              Subdomain
              <div className="relative mt-2">
                <Input
                  className="h-11 border-outline-variant pr-28"
                  placeholder="subdomain"
                  value={subdomain}
                  onChange={(e) =>
                    setSubdomain(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    )
                  }
                  pattern="[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">
                  .hrmsapp.com
                </span>
              </div>
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Administrator email
              <Input
                className="mt-2 h-11 border-outline-variant"
                type="email"
                placeholder="admin@company.om"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </label>
            <label className="text-sm font-semibold">
              Subscription plan
              <select
                className="mt-2 h-11 w-full rounded-lg border border-outline-variant bg-white px-3"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                required
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} (up to {plan.maxEmployees})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Employee limit
              <Input
                className="mt-2 h-11 border-outline-variant"
                type="number"
                min={1}
                max={plans.find((p) => p.id === planId)?.maxEmployees || 100000}
                value={seatCount}
                onChange={(e) => setSeatCount(Number(e.target.value))}
                required
              />
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Workspace timezone
              <select
                className="mt-2 h-11 w-full rounded-lg border border-outline-variant bg-white px-3"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="Asia/Muscat">Asia/Muscat (Oman)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (India)</option>
                <option value="Asia/Dubai">Asia/Dubai (UAE)</option>
                <option value="UTC">UTC</option>
              </select>
            </label>
          </div>
          <div className="mt-5 flex gap-3 rounded-lg bg-zinc-50 p-4 text-sm text-on-surface-variant">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <p>
              An expiring setup invitation will be sent to the administrator. No
              temporary password is created or exposed.
            </p>
          </div>
          <div className="mt-7 flex gap-3">
            <Button
              type="submit"
              disabled={busy || !plans.length}
              className="h-12 flex-1 bg-primary text-white hover:bg-primary/90"
            >
              {busy ? "Creating tenant..." : "Create & send invite"}
              <ArrowRight />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 px-6"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </form>
        <aside className="border-l border-surface-variant bg-surface-variant p-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
            <ShieldCheck className="size-4" />
            Admin security
          </div>
          <p className="mt-4 text-sm leading-6 text-on-surface-variant">
            The business admin will complete secure account setup from their
            email invitation.
          </p>
          <div className="mt-12 rounded-xl border border-zinc-300 bg-white p-4 shadow-sm">
            <div className="mb-3 h-2 w-24 rounded bg-surface-variant" />
            <div className="grid h-28 place-items-center rounded-lg bg-[radial-gradient(#e0e0e0_1px,transparent_1px)] [background-size:12px_12px]">
              <div className="grid size-10 place-items-center rounded-full bg-zinc-100 text-primary">
                <MapPin />
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold">Region: Muscat, Oman</p>
            <p className="text-[10px] text-outline">
              Default timezone: GMT+4
            </p>
          </div>
          <div className="mt-10 h-1.5 overflow-hidden rounded-full bg-white">
            <div className="h-full w-4/5 bg-emerald-300" />
          </div>
          <p className="mt-2 text-[10px] text-outline">
            Tenant setup 80% complete
          </p>
        </aside>
      </div>
    </div>
  );
}

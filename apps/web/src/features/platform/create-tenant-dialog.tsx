"use client";

import { ArrowRight, CheckCircle2, Eye, EyeOff, MapPin, ShieldCheck, X } from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { getApiErrorMessage } from "@/lib/api-error";
import { platformApiClient } from "@/lib/platform-api-client";
import type { SubscriptionPlan, TenantDetail } from "@/lib/platform-types";
import { APP_DOMAIN } from "@/lib/app-domain";

const employeeBands = [
  { label: "Select range", value: "" },
  { label: "1 – 10 Employees", value: "1-10" },
  { label: "11 – 50 Employees", value: "11-50" },
  { label: "51 – 200 Employees", value: "51-200" },
  { label: "201 – 500 Employees", value: "201-500" },
  { label: "501+ Employees", value: "501+" },
];

const TIMEZONES = [
  { value: "Asia/Muscat", label: "Asia/Muscat (Oman, GMT+4)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (UAE, GMT+4)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (India, GMT+5:30)" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh (Saudi Arabia, GMT+3)" },
  { value: "Asia/Kuwait", label: "Asia/Kuwait (Kuwait, GMT+3)" },
  { value: "Asia/Bahrain", label: "Asia/Bahrain (Bahrain, GMT+3)" },
  { value: "Asia/Qatar", label: "Asia/Qatar (Qatar, GMT+3)" },
  { value: "Asia/Baghdad", label: "Asia/Baghdad (Iraq, GMT+3)" },
  { value: "Europe/London", label: "Europe/London (UK, GMT+0/+1)" },
  { value: "America/New_York", label: "America/New_York (US Eastern)" },
  { value: "UTC", label: "UTC" },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
}

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
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id || "");
  const [seatCount, setSeatCount] = useState(50);
  const [timezone, setTimezone] = useState("Asia/Muscat");
  const [setPasswordNow, setSetPasswordNow] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const subdomainPreview = useMemo(() => {
    const slug = subdomain || slugify(companyName) || "yourcompany";
    return `${slug}.${APP_DOMAIN}`;
  }, [subdomain, companyName]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        companyName,
        subdomain: subdomain || slugify(companyName),
        adminEmail,
        planId,
        moduleKeys: ["ATTENDANCE"],
        timezone,
        seatCount,
      };
      if (setPasswordNow && adminPassword) {
        payload.adminPassword = adminPassword;
      }
      const { data } = await platformApiClient.post<
        TenantDetail & { tenant: { id: string } }
      >(
        "/platform/tenants",
        payload,
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
      <div className="grid max-h-[94vh] w-full max-w-[960px] overflow-auto rounded-xl bg-white shadow-2xl md:grid-cols-[1fr_260px]">
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
            {/* Company name */}
            <label className="text-sm font-semibold">
              Company name
              <Input
                className="mt-2 h-11 border-outline-variant"
                placeholder="e.g. Muscat Tech Solutions"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  if (!subdomainEdited)
                    setSubdomain(slugify(e.target.value));
                }}
                minLength={2}
                required
              />
            </label>

            {/* Subdomain */}
            <label className="text-sm font-semibold">
              Subdomain
              <div className="relative mt-2">
                <Input
                  className="h-11 border-outline-variant pr-4"
                  placeholder="subdomain"
                  value={subdomain}
                  onChange={(e) => {
                    setSubdomainEdited(true);
                    setSubdomain(slugify(e.target.value));
                  }}
                  pattern="[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-primary font-medium">
                Preview: <span className="font-bold">{subdomainPreview}</span>
              </p>
            </label>

            {/* Admin email */}
            <label className="text-sm font-semibold sm:col-span-2">
              Administrator email
              <Input
                className="mt-2 h-11 border-outline-variant"
                type="email"
                placeholder="admin@company.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </label>

            {/* Employee count band */}
            <label className="text-sm font-semibold">
              Employee count
              <div className="relative mt-2">
                <select
                  className="h-11 w-full appearance-none rounded-lg border border-outline-variant bg-white px-3 pr-8"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                  required
                >
                  {employeeBands.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>
            </label>

            {/* Seat limit */}
            <label className="text-sm font-semibold">
              Seat limit
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

            {/* Subscription plan */}
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

            {/* Timezone */}
            <label className="text-sm font-semibold">
              Workspace timezone
              <select
                className="mt-2 h-11 w-full rounded-lg border border-outline-variant bg-white px-3"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </label>

            {/* Optional: Set admin password now */}
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-outline-variant text-primary"
                  checked={setPasswordNow}
                  onChange={(e) => setSetPasswordNow(e.target.checked)}
                />
                Set admin password now (skip email invitation setup)
              </label>
              {setPasswordNow && (
                <div className="relative mt-3">
                  <Input
                    className="h-11 border-outline-variant pr-12"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    minLength={8}
                    required={setPasswordNow}
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex gap-3 rounded-lg bg-zinc-50 p-4 text-sm text-on-surface-variant">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <p>
              {setPasswordNow
                ? "The admin account will be created with the password you set. An invitation email is still sent to verify ownership."
                : "An expiring setup invitation will be sent to the administrator. No temporary password is created or exposed."}
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
            {setPasswordNow
              ? "You are pre-setting the admin password. The account will be immediately usable after tenant creation."
              : "The business admin will complete secure account setup from their email invitation."}
          </p>
          <div className="mt-12 rounded-xl border border-zinc-300 bg-white p-4 shadow-sm">
            <div className="mb-3 h-2 w-24 rounded bg-surface-variant" />
            <div className="grid h-28 place-items-center rounded-lg bg-[radial-gradient(#e0e0e0_1px,transparent_1px)] [background-size:12px_12px]">
              <div className="grid size-10 place-items-center rounded-full bg-zinc-100 text-primary">
                <MapPin />
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold">
              {subdomain || "yourcompany"}.{APP_DOMAIN}
            </p>
            <p className="text-[10px] text-outline">
              Timezone: {timezone}
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

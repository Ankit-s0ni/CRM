"use client";

import { Check, Globe2, Languages, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import { platformApiClient } from "@/lib/platform-api-client";
import { usePlatformAuthStore } from "@/lib/platform-auth-store";
import { Button } from "@/shared/ui/button";

type Locale = "en" | "ar" | "ar-OM" | "ar-AE";
type TenantPolicy = {
  tenantId: string;
  defaultLocale: Locale;
  regionalLocale: Locale;
  regionalOverrideReason: string | null;
  enabledLocales: Locale[];
  allowUserPreference: boolean;
  allowTenantOverrides: boolean;
  catalogVersion: number;
  updatedAt: string;
};
type PolicyResponse = {
  policy: TenantPolicy;
  tenant: { id: string; companyName: string; subdomain: string };
  offices: Array<{
    id: string;
    officeName: string;
    countryCode: string | null;
  }>;
  suggestedRegionalLocale: Locale;
  overrides: Array<{
    id: string;
    locale: Locale;
    value: string;
    status: string;
    version: number;
    reason: string;
    key: { key: string; defaultMessage: string };
  }>;
};

const localeNames: Record<Locale, string> = {
  en: "English",
  ar: "Arabic (base)",
  "ar-OM": "Arabic (Oman)",
  "ar-AE": "Arabic (UAE)",
};
const allLocales: Locale[] = ["en", "ar", "ar-OM", "ar-AE"];

export function TenantLocalizationPanel({ tenantId }: { tenantId: string }) {
  const permissions = usePlatformAuthStore(
    (state) => state.user?.permissions ?? [],
  );
  const canRead = permissions.includes("platform.localization.read");
  const canManage = permissions.includes(
    "platform.localization.tenants.manage",
  );
  const [data, setData] = useState<PolicyResponse | null>(null);
  const [draft, setDraft] = useState<TenantPolicy | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [previewLocale, setPreviewLocale] = useState<Locale>("en");
  const [preview, setPreview] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!canRead) return;
    let active = true;
    platformApiClient
      .get<{ data: PolicyResponse }>(
        `/platform/localization/tenants/${tenantId}/policy`,
      )
      .then(({ data: response }) => {
        if (!active) return;
        setData(response.data);
        setDraft(response.data.policy);
        setPreviewLocale(response.data.policy.defaultLocale);
        setOverrideReason(response.data.policy.regionalOverrideReason ?? "");
      })
      .catch((requestError) => {
        if (active) {
          setError(
            getApiErrorMessage(
              requestError,
              "Tenant localization policy could not be loaded.",
            ),
          );
        }
      });
    return () => {
      active = false;
    };
  }, [canRead, tenantId]);

  useEffect(() => {
    if (!canRead || !draft?.enabledLocales.includes(previewLocale)) return;
    let active = true;
    platformApiClient
      .get<{
        data: {
          messages: Record<string, string>;
        };
      }>(`/platform/localization/tenants/${tenantId}/preview`, {
        params: { locale: previewLocale },
      })
      .then(({ data: response }) => {
        if (active) setPreview(response.data.messages);
      })
      .catch(() => {
        if (active) setPreview({});
      });
    return () => {
      active = false;
    };
  }, [
    canRead,
    draft?.catalogVersion,
    draft?.enabledLocales,
    previewLocale,
    tenantId,
  ]);

  if (!canRead) return null;

  function toggleLocale(locale: Locale, checked: boolean) {
    if (!draft) return;
    const enabledLocales = checked
      ? [...new Set([...draft.enabledLocales, locale])]
      : draft.enabledLocales.filter((item) => item !== locale);
    if (!enabledLocales.length) return;
    setDraft({
      ...draft,
      enabledLocales,
      defaultLocale: enabledLocales.includes(draft.defaultLocale)
        ? draft.defaultLocale
        : enabledLocales[0],
      allowUserPreference:
        enabledLocales.length > 1 ? draft.allowUserPreference : false,
    });
  }

  async function save() {
    if (!draft || !data) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data: response } = await platformApiClient.patch<{
        data: TenantPolicy;
      }>(`/platform/localization/tenants/${tenantId}/policy`, {
        defaultLocale: draft.defaultLocale,
        regionalLocale: draft.regionalLocale,
        enabledLocales: draft.enabledLocales,
        allowUserPreference: draft.allowUserPreference,
        allowTenantOverrides: draft.allowTenantOverrides,
        overrideReason:
          draft.regionalLocale === data.suggestedRegionalLocale
            ? undefined
            : overrideReason.trim(),
      });
      setDraft(response.data);
      setData({ ...data, policy: response.data });
      setNotice(
        "Tenant localization policy saved and catalog cache invalidated.",
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "The tenant localization policy could not be saved.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!draft || !data) {
    return (
      <section className="mt-5 rounded-xl border border-surface-variant bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Globe2 className="size-5 text-foreground" />
          <div>
            <h2 className="font-semibold">Localization</h2>
            <p className="text-xs text-outline">
              {error || "Loading tenant language policy..."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const regionOverridden =
    draft.regionalLocale !== data.suggestedRegionalLocale;
  const direction = previewLocale.startsWith("ar") ? "rtl" : "ltr";

  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-surface-variant bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-variant p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-muted text-foreground">
            <Languages className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">Tenant localization</h2>
            <p className="mt-1 text-xs text-outline">
              Regional resolution, allowed languages and tenant terminology
              governance.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold"
            href={`/platform/audit?tenantId=${tenantId}&module=localization`}
          >
            Audit history
          </Link>
          {canManage && (
            <Button
              className="bg-foreground text-on-tone"
              disabled={
                busy ||
                !draft.enabledLocales.includes(draft.defaultLocale) ||
                (regionOverridden && overrideReason.trim().length < 10)
              }
              onClick={() => void save()}
            >
              <Check className="size-4" />
              {busy ? "Saving..." : "Save policy"}
            </Button>
          )}
        </div>
      </div>
      {error && (
        <div className="border-b theme-tone theme-tone-red border p-4 text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div className="border-b theme-tone theme-tone-emerald border p-4 text-sm">
          {notice}
        </div>
      )}
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-6 p-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Regional Arabic pack
            <select
              className="h-11 rounded-lg border border-border bg-card px-3"
              disabled={!canManage}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  regionalLocale: event.target.value as Locale,
                })
              }
              value={draft.regionalLocale}
            >
              {(["ar", "ar-OM", "ar-AE"] as Locale[]).map((locale) => (
                <option key={locale} value={locale}>
                  {localeNames[locale]}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="text-sm font-semibold">Market suggestion</span>
            <div className="mt-2 flex h-11 items-center justify-between rounded-lg border border-border bg-muted px-3 text-sm">
              <span>{localeNames[data.suggestedRegionalLocale]}</span>
              <ShieldCheck className="size-4 theme-tone-text" />
            </div>
          </div>
          {regionOverridden && (
            <label className="grid gap-2 text-sm font-semibold md:col-span-2">
              Required override reason
              <textarea
                className="min-h-20 rounded-lg border theme-tone theme-tone-amber border p-3 text-sm"
                disabled={!canManage}
                onChange={(event) => setOverrideReason(event.target.value)}
                placeholder="Explain why this tenant does not use its office-country locale..."
                value={overrideReason}
              />
            </label>
          )}
          <div className="md:col-span-2">
            <span className="text-sm font-semibold">
              Office-country evidence
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.offices.map((office) => (
                <span
                  className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs"
                  key={office.id}
                >
                  <MapPin className="size-3 text-foreground" />
                  {office.officeName} · {office.countryCode}
                </span>
              ))}
              {!data.offices.length && (
                <span className="text-xs theme-tone-text">
                  No office country is configured; base Arabic is suggested.
                </span>
              )}
            </div>
          </div>
          <div className="md:col-span-2">
            <span className="text-sm font-semibold">Allowed languages</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {allLocales.map((locale) => (
                <label
                  className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm"
                  key={locale}
                >
                  <input
                    checked={draft.enabledLocales.includes(locale)}
                    disabled={!canManage}
                    onChange={(event) =>
                      toggleLocale(locale, event.target.checked)
                    }
                    type="checkbox"
                  />
                  {localeNames[locale]}
                </label>
              ))}
            </div>
          </div>
          <label className="grid gap-2 text-sm font-semibold">
            Tenant default
            <select
              className="h-11 rounded-lg border border-border bg-card px-3"
              disabled={!canManage}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  defaultLocale: event.target.value as Locale,
                })
              }
              value={draft.defaultLocale}
            >
              {draft.enabledLocales.map((locale) => (
                <option key={locale} value={locale}>
                  {localeNames[locale]}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3">
            <label className="flex items-center gap-3 text-sm">
              <input
                checked={draft.allowUserPreference}
                disabled={!canManage || draft.enabledLocales.length < 2}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    allowUserPreference: event.target.checked,
                  })
                }
                type="checkbox"
              />
              Allow user language preference
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                checked={draft.allowTenantOverrides}
                disabled={!canManage}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    allowTenantOverrides: event.target.checked,
                  })
                }
                type="checkbox"
              />
              Allow tenant terminology overrides
            </label>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                Tenant overrides ({data.overrides.length})
              </span>
              <span className="text-xs text-outline">
                Catalog version {draft.catalogVersion}
              </span>
            </div>
            <div className="mt-2 grid max-h-48 gap-2 overflow-auto">
              {data.overrides.map((override) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl bg-muted p-3 text-xs"
                  key={override.id}
                >
                  <div className="min-w-0">
                    <strong className="block truncate">
                      {override.key.defaultMessage}
                    </strong>
                    <span className="text-outline">
                      {override.locale} · v{override.version} ·{" "}
                      {override.reason}
                    </span>
                  </div>
                  <span className="rounded-full bg-card px-2 py-1 font-bold">
                    {override.status}
                  </span>
                </div>
              ))}
              {!data.overrides.length && (
                <p className="rounded-xl bg-muted p-3 text-xs text-outline">
                  No tenant-specific wording has been created.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-surface-variant bg-muted p-5 xl:border-l xl:border-t-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Resolved preview</h3>
              <p className="text-xs text-outline">
                Published pack plus tenant overrides
              </p>
            </div>
            <select
              className="h-9 rounded-lg border border-border bg-card px-2 text-xs"
              onChange={(event) =>
                setPreviewLocale(event.target.value as Locale)
              }
              value={previewLocale}
            >
              {draft.enabledLocales.map((locale) => (
                <option key={locale} value={locale}>
                  {localeNames[locale]}
                </option>
              ))}
            </select>
          </div>
          <div
            className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
            dir={direction}
            lang={previewLocale}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">
              {preview["tenant.dashboard.header.eyebrow"] ??
                "Workspace operations"}
            </p>
            <h4 className="mt-1 text-2xl font-bold">
              {preview["tenant.dashboard.header.title"] ?? "HR operations"}
            </h4>
            <p className="mt-2 text-sm text-outline">
              {preview["tenant.dashboard.workforce.scope"] ??
                "Counts follow your employee reporting scope"}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ["attendance.status.present", "Present", "18"],
                ["attendance.status.late", "Late", "2"],
              ].map(([key, fallback, value]) => (
                <div
                  className="rounded-xl border border-border p-3"
                  key={key}
                >
                  <span className="text-xs text-outline">
                    {preview[key] ?? fallback}
                  </span>
                  <strong className="mt-2 block text-xl">{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

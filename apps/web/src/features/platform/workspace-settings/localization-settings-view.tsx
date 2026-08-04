"use client";

import {
  Check,
  ChevronRight,
  Globe2,
  Languages,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import type { AppLanguage } from "@/i18n/routing";
import { useTenantLocalization } from "@/lib/tenant-localization";
import {
  AdminPage,
  ErrorState,
  LoadingState,
  Panel,
  PrimaryButton,
  inputClass,
} from "@/shared/components/page-primitives";

type LocalePolicy = {
  tenantId: string;
  defaultLanguage: AppLanguage;
  regionalArabicLocale: "ar" | "ar-OM" | "ar-AE";
  enabledLanguages: AppLanguage[];
  allowUserPreference: boolean;
  allowTenantOverrides: boolean;
  catalogVersion: number;
  updatedAt: string;
};

type EditableKey = {
  id: string;
  key: string;
  namespace: string;
  defaultMessage: string;
  description: string | null;
  placeholderSchema: Record<string, string>;
};

type TenantOverride = {
  id: string;
  locale: AppLanguage;
  value: string;
  status: "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
  reason: string;
  version: number;
  updatedAt: string;
  key: EditableKey;
};

const localeNames: Record<AppLanguage, string> = {
  en: "English",
  ar: "العربية",
};

const regionalLocaleNames: Record<"ar" | "ar-OM" | "ar-AE", string> = {
  ar: "Arabic",
  "ar-OM": "العربية (عُمان)",
  "ar-AE": "العربية (الإمارات)",
};

export function LocalizationSettingsView() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { t, locale: activeLocale } = useTenantLocalization();
  const permissions = user?.permissions ?? [];
  const canManage = permissions.includes("workspace.localization.manage");
  const canManageOverrides = permissions.includes(
    "workspace.localization.overrides.manage",
  );
  const [policy, setPolicy] = useState<LocalePolicy | null>(null);
  const [draft, setDraft] = useState<LocalePolicy | null>(null);
  const [overrides, setOverrides] = useState<TenantOverride[]>([]);
  const [editableKeys, setEditableKeys] = useState<EditableKey[]>([]);
  const [previewLocale, setPreviewLocale] = useState<AppLanguage>("en");
  const [previewMessages, setPreviewMessages] = useState<
    Record<string, string>
  >({});
  const [overrideKey, setOverrideKey] = useState("");
  const [overrideLocale, setOverrideLocale] = useState<AppLanguage>("en");
  const [overrideValue, setOverrideValue] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.get<LocalePolicy>("/tenant-localization-policy"),
      apiClient.get<{
        data: {
          overrides: TenantOverride[];
          editableKeys: EditableKey[];
        };
      }>("/tenant-localization-overrides"),
    ])
      .then(([policyResponse, overrideResponse]) => {
        if (!active) return;
        setPolicy(policyResponse.data);
        setDraft(policyResponse.data);
        setPreviewLocale(policyResponse.data.defaultLanguage);
        setOverrideLocale(policyResponse.data.defaultLanguage);
        setOverrides(overrideResponse.data.data.overrides);
        setEditableKeys(overrideResponse.data.data.editableKeys);
        setOverrideKey(overrideResponse.data.data.editableKeys[0]?.key ?? "");
      })
      .catch((requestError) => {
        if (active) {
          setError(
            getApiErrorMessage(
              requestError,
              "Localization settings could not be loaded.",
            ),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!draft?.enabledLanguages.includes(previewLocale)) return;
    let active = true;
    apiClient
      .get<{
        data: {
          messages: Record<string, string>;
        };
      }>("/localization/catalog", {
        params: {
          language: previewLocale,
          namespaces: "tenant-shell,tenant-navigation,tenant-dashboard",
        },
      })
      .then(({ data }) => {
        if (active) setPreviewMessages(data.data.messages);
      })
      .catch(() => {
        if (active) setPreviewMessages({});
      });
    return () => {
      active = false;
    };
  }, [draft?.catalogVersion, draft?.enabledLanguages, previewLocale]);

  function updateEnabled(language: AppLanguage, enabled: boolean) {
    if (!draft) return;
    const enabledLanguages = enabled
      ? [...new Set([...draft.enabledLanguages, language])]
      : draft.enabledLanguages.filter((value) => value !== language);
    if (!enabledLanguages.length) return;
    setDraft({
      ...draft,
      enabledLanguages,
      defaultLanguage: enabledLanguages.includes(draft.defaultLanguage)
        ? draft.defaultLanguage
        : enabledLanguages[0],
      allowUserPreference:
        enabledLanguages.length > 1 ? draft.allowUserPreference : false,
    });
  }

  async function savePolicy() {
    if (!draft || !user) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data } = await apiClient.patch<LocalePolicy>(
        "/tenant-localization-policy",
        {
          defaultLanguage: draft.defaultLanguage,
          enabledLanguages: draft.enabledLanguages,
          allowUserPreference:
            draft.enabledLanguages.length > 1 && draft.allowUserPreference,
        },
      );
      setPolicy(data);
      setDraft(data);
      setUser({
        ...user,
        localization: {
          defaultLanguage: data.defaultLanguage,
          enabledLanguages: data.enabledLanguages,
          catalogVersion: data.catalogVersion,
          allowUserPreference: data.allowUserPreference,
          regionalArabicLocale: data.regionalArabicLocale,
          currency: user.localization?.currency ?? "OMR",
        },
      });
      setNotice(
        t("tenant.localization.saved", "Workspace language policy saved."),
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "The workspace language policy could not be saved.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function createOverride() {
    if (
      !overrideKey ||
      !overrideValue.trim() ||
      overrideReason.trim().length < 5
    ) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = await apiClient.post<TenantOverride>(
        "/tenant-localization-overrides",
        {
          key: overrideKey,
          locale: overrideLocale,
          value: overrideValue.trim(),
          reason: overrideReason.trim(),
        },
      );
      setOverrides((current) => [data, ...current]);
      setOverrideValue("");
      setOverrideReason("");
      setNotice(
        "Override draft created. Submit it for review before publishing.",
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "The terminology override could not be created.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function transitionOverride(
    override: TenantOverride,
    status: "REVIEW" | "PUBLISHED" | "ARCHIVED",
  ) {
    setSaving(true);
    setError("");
    try {
      const { data } = await apiClient.patch<TenantOverride>(
        `/tenant-localization-overrides/${override.id}`,
        { status },
      );
      setOverrides((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      );
      setNotice(`Override moved to ${status.toLowerCase()}.`);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "The override status could not be changed.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] p-5 lg:p-8">
        <LoadingState />
      </div>
    );
  }
  if (!draft || !policy) {
    return (
      <div className="mx-auto max-w-[1440px] p-5 lg:p-8">
        <ErrorState
          message={error || "Localization settings are unavailable."}
        />
      </div>
    );
  }

  const regionalLocale = draft.regionalArabicLocale;
  const previewDirection = previewLocale.startsWith("ar") ? "rtl" : "ltr";
  const preview = (key: string, fallback: string) =>
    previewMessages[key] ?? fallback;

  return (
    <AdminPage
      action={
        canManage ? (
          <PrimaryButton
            disabled={saving}
            onClick={() => void savePolicy()}
            type="button"
          >
            <Check className="size-4" />
            {saving
              ? t("common.state.saving", "Saving...")
              : t("common.action.save", "Save changes")}
          </PrimaryButton>
        ) : undefined
      }
      description={t(
        "tenant.localization.description",
        "Choose the workspace language and preview the regional Arabic experience.",
      )}
      title={t("tenant.localization.title", "Language & localization")}
    >
      {error && <ErrorState message={error} />}
      {notice && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </div>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-5">
          <Panel className="overflow-hidden">
            <div className="border-b border-surface-variant p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#f3efe6] text-[#151515]">
                  <Globe2 className="size-5" />
                </span>
                <div>
                  <h2 className="font-semibold">
                    {t(
                      "tenant.localization.workspacePolicy",
                      "Workspace language policy",
                    )}
                  </h2>
                  <p className="mt-1 text-xs text-outline">
                    {t(
                      "tenant.localization.regionalResolved",
                      "Regional Arabic is resolved from your office country.",
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-6 p-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                {t("tenant.localization.defaultLanguage", "Default language")}
                <select
                  className={inputClass}
                  disabled={!canManage}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      defaultLanguage: event.target.value as AppLanguage,
                    })
                  }
                  value={draft.defaultLanguage}
                >
                  {draft.enabledLanguages.map((locale) => (
                    <option key={locale} value={locale}>
                      {localeNames[locale]}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="text-sm font-semibold">
                  {t(
                    "tenant.localization.approvedRegional",
                    "Approved regional pack",
                  )}
                </span>
                <div className="mt-2 flex h-11 items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm">
                  <span>{regionalLocaleNames[regionalLocale]}</span>
                  <ShieldCheck className="size-4 text-emerald-600" />
                </div>
              </div>
              <div className="md:col-span-2">
                <span className="text-sm font-semibold">
                  {t(
                    "tenant.localization.enabledLanguages",
                    "Enabled languages",
                  )}
                </span>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(["en", "ar"] as AppLanguage[]).map(
                    (locale) => {
                      const enabled = draft.enabledLanguages.includes(locale);
                      return (
                        <label
                          className="flex min-h-16 items-center gap-3 rounded-xl border border-zinc-200 p-4"
                          key={locale}
                        >
                          <input
                            checked={enabled}
                            className="size-4 accent-primary"
                            disabled={!canManage}
                            onChange={(event) =>
                              updateEnabled(locale, event.target.checked)
                            }
                            type="checkbox"
                          />
                          <span>
                            <span className="block text-sm font-semibold">
                              {localeNames[locale]}
                            </span>
                            <span className="text-xs text-outline">
                              {locale === "en"
                                ? "English interface"
                                : regionalLocaleNames[regionalLocale]}
                            </span>
                          </span>
                        </label>
                      );
                    },
                  )}
                </div>
              </div>
              <label className="flex items-start gap-3 md:col-span-2">
                <input
                  checked={draft.allowUserPreference}
                  className="mt-1 size-4 accent-primary"
                  disabled={!canManage || draft.enabledLanguages.length < 2}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      allowUserPreference: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
                <span>
                  <span className="block text-sm font-semibold">
                    {t(
                      "tenant.localization.userChoice",
                      "Let users choose their language",
                    )}
                  </span>
                  <span className="text-xs text-outline">
                    {t(
                      "tenant.localization.userChoiceBody",
                      "The tenant default remains authoritative when user choice is disabled.",
                    )}
                  </span>
                </span>
              </label>
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-variant p-5">
              <div>
                <h2 className="font-semibold">Tenant terminology overrides</h2>
                <p className="mt-1 text-xs text-outline">
                  Only approved labels can be changed. Published wording is
                  versioned and audited.
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  policy.allowTenantOverrides
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {policy.allowTenantOverrides
                  ? "Enabled by platform"
                  : "Disabled by platform"}
              </span>
            </div>
            {policy.allowTenantOverrides && canManageOverrides ? (
              <div className="grid gap-4 border-b border-surface-variant bg-zinc-50/70 p-5 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  Approved label
                  <select
                    className={inputClass}
                    onChange={(event) => setOverrideKey(event.target.value)}
                    value={overrideKey}
                  >
                    {editableKeys.map((key) => (
                      <option key={key.id} value={key.key}>
                        {key.defaultMessage}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Language
                  <select
                    className={inputClass}
                    onChange={(event) =>
                      setOverrideLocale(event.target.value as AppLanguage)
                    }
                    value={overrideLocale}
                  >
                    {draft.enabledLanguages.map((locale) => (
                      <option key={locale} value={locale}>
                        {localeNames[locale]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Replacement wording
                  <input
                    className={inputClass}
                    onChange={(event) => setOverrideValue(event.target.value)}
                    value={overrideValue}
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Reason
                  <input
                    className={inputClass}
                    onChange={(event) => setOverrideReason(event.target.value)}
                    placeholder="Why is this wording needed?"
                    value={overrideReason}
                  />
                </label>
                <div className="md:col-span-2">
                  <PrimaryButton
                    disabled={
                      saving ||
                      !overrideKey ||
                      !overrideValue.trim() ||
                      overrideReason.trim().length < 5
                    }
                    onClick={() => void createOverride()}
                    type="button"
                  >
                    Create draft
                  </PrimaryButton>
                </div>
              </div>
            ) : (
              <p className="border-b border-surface-variant p-5 text-sm text-outline">
                Platform policy does not currently allow tenant-specific
                terminology changes.
              </p>
            )}
            <div className="divide-y divide-surface-variant">
              {overrides.map((override) => (
                <div
                  className="flex flex-wrap items-center gap-4 p-5"
                  key={override.id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm">
                        {override.key.defaultMessage}
                      </strong>
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold">
                        {override.locale}
                      </span>
                      <span className="rounded-full bg-[#f3efe6] px-2 py-1 text-[10px] font-bold text-[#151515]">
                        {override.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{override.value}</p>
                    <p className="mt-1 text-xs text-outline">
                      v{override.version} · {override.reason}
                    </p>
                  </div>
                  {override.status === "DRAFT" && canManageOverrides && (
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-300 px-3 text-xs font-semibold"
                      disabled={saving}
                      onClick={() =>
                        void transitionOverride(override, "REVIEW")
                      }
                      type="button"
                    >
                      Submit for review <ChevronRight className="size-3" />
                    </button>
                  )}
                  {override.status === "REVIEW" && canManageOverrides && (
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#151515] px-3 text-xs font-semibold text-white"
                      disabled={saving}
                      onClick={() =>
                        void transitionOverride(override, "PUBLISHED")
                      }
                      type="button"
                    >
                      Publish <Check className="size-3" />
                    </button>
                  )}
                </div>
              ))}
              {!overrides.length && (
                <p className="p-5 text-sm text-outline">
                  No tenant terminology overrides have been created.
                </p>
              )}
            </div>
          </Panel>
        </div>

        <Panel className="sticky top-24 overflow-hidden">
          <div className="flex items-center justify-between border-b border-surface-variant p-5">
            <div className="flex items-center gap-3">
              <Languages className="size-5 text-[#151515]" />
              <div>
                <h2 className="font-semibold">Live preview</h2>
                <p className="text-xs text-outline">Actual published catalog</p>
              </div>
            </div>
            <select
              className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-xs"
              onChange={(event) =>
                setPreviewLocale(event.target.value as AppLanguage)
              }
              value={previewLocale}
            >
              {draft.enabledLanguages.map((locale) => (
                <option key={locale} value={locale}>
                  {localeNames[locale]}
                </option>
              ))}
            </select>
          </div>
          <div
            className="min-h-80 bg-zinc-50 p-5"
            dir={previewDirection}
            lang={previewLocale}
          >
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[#151515]">
                {preview(
                  "tenant.dashboard.header.eyebrow",
                  "Workspace operations",
                )}
              </p>
              <h3 className="mt-1 text-2xl font-bold">
                {preview("tenant.dashboard.header.title", "HR operations")}
              </h3>
              <p className="mt-2 text-sm text-outline">
                {preview(
                  "tenant.dashboard.workforce.scope",
                  "Counts follow your employee reporting scope",
                )}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  preview("attendance.status.present", "Present"),
                  preview("attendance.status.late", "Late"),
                ].map((label, index) => (
                  <div
                    className="rounded-xl border border-zinc-200 p-4"
                    key={label}
                  >
                    <span className="text-xs text-outline">{label}</span>
                    <strong className="mt-2 block text-2xl">
                      {index ? "٢" : "١٨"}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#f3efe6] p-3 text-xs font-semibold text-[#151515]">
                <RefreshCw className="size-4" />
                {preview(
                  "tenant.dashboard.attention.openRegister",
                  "Open attendance register",
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-surface-variant p-4 text-xs text-outline">
            Current session: {localeNames[activeLocale]} · Preview:{" "}
            {localeNames[previewLocale]} ({previewDirection.toUpperCase()})
          </div>
        </Panel>
      </div>
    </AdminPage>
  );
}

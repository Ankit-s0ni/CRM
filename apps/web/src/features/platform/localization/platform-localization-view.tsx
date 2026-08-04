"use client";

import {
  ArrowLeft,
  ArrowDownToLine,
  Archive as ArchiveIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileUp,
  Languages,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import { platformApiClient } from "@/lib/platform-api-client";
import { usePlatformAuthStore } from "@/lib/platform-auth-store";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";

type PackStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
type PackSummary = {
  id: string;
  locale: string;
  displayName: string;
  nativeName: string;
  parentLocale: string | null;
  direction: "LTR" | "RTL";
  status: PackStatus;
  version: number;
  coverage: number;
  translatedKeys: number;
  requiredKeys: number;
  affectedTenants: number;
  publishedAt: string | null;
  versions: Array<{
    version: number;
    status: PackStatus;
    publishedAt: string | null;
    publishedBy: string | null;
  }>;
};

type PackKey = {
  id: string;
  key: string;
  namespace: string;
  defaultMessage: string;
  description: string | null;
  placeholderSchema: Record<string, string>;
  isTenantEditable: boolean;
  translation: null | {
    value: string;
    status: PackStatus;
    reviewedAt: string | null;
  };
};

type PackDetail = PackSummary & { keys: PackKey[] };

const localeOrder = ["en", "ar", "ar-OM", "ar-AE"];

export function PlatformLocalizationEditor({
  locale,
}: {
  locale: string;
}) {
  const permissions = usePlatformAuthStore(
    (state) => state.user?.permissions ?? [],
  );
  const canTranslate = permissions.includes("platform.localization.translate");
  const canReview = permissions.includes("platform.localization.review");
  const canPublish = permissions.includes("platform.localization.publish");
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [selectedLocale] = useState(locale);
  const [detail, setDetail] = useState<PackDetail | null>(null);
  const [baseArabic, setBaseArabic] = useState<Map<string, string>>(new Map());
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [namespace, setNamespace] = useState("ALL");
  const [missingOnly, setMissingOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editingKey, setEditingKey] = useState("");
  const [value, setValue] = useState("");
  const [importReport, setImportReport] = useState<{
    valid: boolean;
    accepted: number;
    errors: Array<{ row: number; key: string; error: string }>;
    translations?: Array<{ key: string; value: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadPacks() {
    const { data } = await platformApiClient.get<{
      data: PackSummary[];
    }>("/platform/localization/packs");
    const sorted = [...data.data].sort(
      (a, b) => localeOrder.indexOf(a.locale) - localeOrder.indexOf(b.locale),
    );
    setPacks(sorted);
  }

  async function loadDetail(locale: string) {
    const requests: Array<Promise<unknown>> = [
      platformApiClient.get<{ data: PackDetail }>(
        `/platform/localization/packs/${locale}`,
      ),
    ];
    if (locale.startsWith("ar") && locale !== "ar") {
      requests.push(
        platformApiClient.get<{ data: PackDetail }>(
          "/platform/localization/packs/ar",
        ),
      );
    }
    const [selectedResponse, arabicResponse] = await Promise.all(requests);
    const selected = selectedResponse as {
      data: { data: PackDetail };
    };
    setDetail(selected.data.data);
    if (arabicResponse) {
      const base = arabicResponse as { data: { data: PackDetail } };
      setBaseArabic(
        new Map(
          base.data.data.keys.map((key) => [
            key.key,
            key.translation?.value ?? key.defaultMessage,
          ]),
        ),
      );
    } else {
      setBaseArabic(new Map());
    }
  }

  useEffect(() => {
    let active = true;
    // The platform editor hydrates its API-backed state once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([loadPacks(), loadDetail(selectedLocale)])
      .catch((requestError) => {
        if (active) {
          setError(
            getApiErrorMessage(
              requestError,
              "Localization packs could not be loaded.",
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
    // The route owns the locale, so the initial request intentionally runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEditing(key: PackKey) {
    setEditingKey(key.key);
    setValue(key.translation?.value ?? "");
    setNotice("");
    setError("");
  }

  async function saveTranslation() {
    if (!editingKey || !value.trim()) return;
    setBusy(true);
    setError("");
    try {
      await platformApiClient.patch(
        `/platform/localization/packs/${selectedLocale}/translations`,
        { key: editingKey, value: value.trim() },
      );
      await Promise.all([
        loadDetail(selectedLocale),
        loadPacks(),
      ]);
      setEditingKey("");
      setValue("");
      setNotice(
        "Draft translation saved. Submit the pack for review when ready.",
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "The translation could not be saved."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: "review" | "publish") {
    const selectedPack = packs.find(({ locale }) => locale === selectedLocale);
    if (
      action === "publish" &&
      !window.confirm(
        `Publish ${selectedLocale} v${detail?.version}? This will update ${selectedPack?.affectedTenants ?? 0} tenant policies and archive the previous release.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await platformApiClient.post(
        `/platform/localization/packs/${selectedLocale}/${action}`,
      );
      await Promise.all([
        loadPacks(),
        loadDetail(selectedLocale),
      ]);
      setNotice(
        action === "review"
          ? "Pack submitted for review."
          : "Locale pack published and tenant catalog versions invalidated.",
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          action === "review"
            ? "The pack could not be submitted for review."
            : "The pack could not be published.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function rollback(version: number) {
    if (
      !window.confirm(
        `Restore ${selectedLocale} version ${version}? The current published version will be archived.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await platformApiClient.post(
        `/platform/localization/packs/${selectedLocale}/rollback/${version}`,
      );
      await Promise.all([
        loadPacks(),
        loadDetail(selectedLocale),
      ]);
      setNotice(`Version ${version} restored successfully.`);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "The selected version could not be restored.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function archive(version: number) {
    if (
      !window.confirm(
        `Archive ${selectedLocale} version ${version}? It will no longer be editable or publishable.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await platformApiClient.post(
        `/platform/localization/packs/${selectedLocale}/archive/${version}`,
      );
      await Promise.all([
        loadPacks(),
        loadDetail(selectedLocale),
      ]);
      setNotice(`Version ${version} archived.`);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "The selected version could not be archived.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  function exportPack(format: "json" | "csv") {
    if (!detail) return;
    const rows = detail.keys.map((key) => ({
      key: key.key,
      value: key.translation?.value ?? "",
    }));
    const content =
      format === "json"
        ? JSON.stringify({ locale: detail.locale, translations: rows }, null, 2)
        : [
            "key,value",
            ...rows.map((row) => `${csvCell(row.key)},${csvCell(row.value)}`),
          ].join("\n");
    const blob = new Blob([content], {
      type: format === "json" ? "application/json" : "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `deltcrm-${detail.locale}-v${detail.version}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function inspectImport(file: File) {
    setError("");
    setImportReport(null);
    try {
      const translations = parseTranslationFile(
        await file.text(),
        file.name.toLowerCase().endsWith(".csv"),
      );
      const { data } = await platformApiClient.post<{
        data: {
          valid: boolean;
          accepted: number;
          errors: Array<{ row: number; key: string; error: string }>;
        };
      }>(`/platform/localization/packs/${selectedLocale}/import`, {
        dryRun: true,
        translations,
      });
      setImportReport({ ...data.data, translations });
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "The import file is invalid. Use exported JSON or CSV format.",
        ),
      );
    }
  }

  async function applyImport() {
    if (!importReport?.valid || !importReport.translations) return;
    setBusy(true);
    setError("");
    try {
      await platformApiClient.post(
        `/platform/localization/packs/${selectedLocale}/import`,
        { dryRun: false, translations: importReport.translations },
      );
      setImportReport(null);
      await Promise.all([
        loadPacks(),
        loadDetail(selectedLocale),
      ]);
      setNotice("Translations imported into a new draft version.");
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "The validated import could not be applied.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  const namespaces = detail
    ? [...new Set(detail.keys.map((key) => key.namespace))]
    : [];
  const filteredKeys =
    detail?.keys.filter((key) => {
      const search = deferredQuery.trim().toLowerCase();
      return (
        (!search ||
          key.key.toLowerCase().includes(search) ||
          key.defaultMessage.toLowerCase().includes(search) ||
          key.translation?.value.toLowerCase().includes(search)) &&
        (namespace === "ALL" || key.namespace === namespace) &&
        (!missingOnly || !key.translation?.value)
      );
    }) ?? [];
  const changedCount =
    detail?.keys.filter(
      (key) =>
        key.translation?.status === "DRAFT" ||
        key.translation?.status === "REVIEW",
    ).length ?? 0;
  const selectedPack = packs.find(({ locale }) => locale === selectedLocale);
  const totalPages = Math.max(1, Math.ceil(filteredKeys.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedKeys = filteredKeys.slice(pageStart, pageStart + pageSize);

  return (
    <div className="mx-auto w-full max-w-[1600px] p-5 lg:p-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            aria-label="Back to languages"
            className="mt-0.5 grid size-10 place-items-center rounded-xl border border-border bg-card transition hover:border-border hover:bg-muted"
            href="/platform/localization"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] theme-tone-text">
              Translation editor
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {detail?.displayName ?? selectedLocale}
              </h1>
              {detail && <PackStatusBadge status={detail.status} />}
            </div>
            <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">
              Edit {detail?.nativeName ?? selectedLocale} translations, review
              coverage, and manage versioned releases.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => exportPack("json")} variant="outline">
            <ArrowDownToLine className="size-4" /> JSON
          </Button>
          <Button onClick={() => exportPack("csv")} variant="outline">
            <ArrowDownToLine className="size-4" /> CSV
          </Button>
          {canTranslate && (
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold">
              <FileUp className="size-4" /> Import
              <input
                accept=".json,.csv,application/json,text/csv"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void inspectImport(file);
                  event.target.value = "";
                }}
                type="file"
              />
            </label>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border theme-tone theme-tone-red border p-4 text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-5 rounded-xl border theme-tone theme-tone-emerald border p-4 text-sm">
          {notice}
        </div>
      )}

      {importReport && (
        <section className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Import dry-run report</h2>
              <p className="mt-1 text-sm text-outline">
                {importReport.accepted} rows accepted ·{" "}
                {importReport.errors.length} errors
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setImportReport(null)} variant="outline">
                Cancel
              </Button>
              <Button
                className="bg-foreground text-on-tone"
                disabled={!importReport.valid || busy}
                onClick={() => void applyImport()}
              >
                Apply valid import
              </Button>
            </div>
          </div>
          {!!importReport.errors.length && (
            <div className="mt-4 max-h-40 overflow-auto rounded-xl theme-tone theme-tone-red border p-4 text-xs">
              {importReport.errors.map((item) => (
                <div key={`${item.row}:${item.key}`}>
                  Row {item.row} · {item.key}: {item.error}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative min-w-64 flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline" />
                <input
                  aria-label="Search localization keys"
                  className="h-10 w-full rounded-xl border border-border bg-muted pl-10 pr-3 text-sm outline-none focus:border-border"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search key, source or translation..."
                  value={query}
                />
              </label>
              <label className="relative">
                <select
                  className="h-10 appearance-none rounded-xl border border-border bg-card px-3 pr-9 text-sm"
                  onChange={(event) => {
                    setNamespace(event.target.value);
                    setPage(1);
                  }}
                  value={namespace}
                >
                  <option value="ALL">All namespaces</option>
                  {namespaces.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2" />
              </label>
              <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm">
                <input
                  checked={missingOnly}
                  onChange={(event) => {
                    setMissingOnly(event.target.checked);
                    setPage(1);
                  }}
                  type="checkbox"
                />
                Missing only
              </label>
            </div>
          </div>
          {loading ? (
            <div className="grid gap-3 p-5">
              {[0, 1, 2, 3].map((item) => (
                <div
                  className="h-28 animate-pulse rounded-xl bg-muted"
                  key={item}
                />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {paginatedKeys.map((key) => {
                const isEditing = editingKey === key.key;
                return (
                  <article className="p-5" key={key.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="text-xs font-semibold text-foreground">
                            {key.key}
                          </code>
                          <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                            {key.namespace}
                          </span>
                          {key.translation && (
                            <PackStatusBadge status={key.translation.status} />
                          )}
                        </div>
                        {key.description && (
                          <p className="mt-1 text-xs text-outline">
                            {key.description}
                          </p>
                        )}
                      </div>
                      {canTranslate &&
                        selectedLocale !== "en" &&
                        !isEditing && (
                          <Button
                            className="h-8 px-3 text-xs"
                            onClick={() => startEditing(key)}
                            variant="outline"
                          >
                            Edit
                          </Button>
                        )}
                    </div>
                    <div
                      className={cn(
                        "mt-4 grid gap-3",
                        selectedLocale.startsWith("ar") &&
                          selectedLocale !== "ar"
                          ? "lg:grid-cols-3"
                          : "lg:grid-cols-2",
                      )}
                    >
                      <MessageCell
                        label="Source English"
                        value={key.defaultMessage}
                      />
                      {selectedLocale.startsWith("ar") &&
                        selectedLocale !== "ar" && (
                          <MessageCell
                            direction="rtl"
                            label="Base Arabic"
                            value={
                              baseArabic.get(key.key) ?? "Inherited source"
                            }
                          />
                        )}
                      <MessageCell
                        direction={
                          selectedLocale.startsWith("ar") ? "rtl" : "ltr"
                        }
                        label={
                          selectedLocale === "ar"
                            ? "Base Arabic"
                            : selectedLocale === "en"
                              ? "English override"
                              : "Regional value"
                        }
                        missing={!key.translation?.value}
                        value={
                          key.translation?.value ||
                          (selectedLocale.startsWith("ar") &&
                          selectedLocale !== "ar"
                            ? "Inherits base Arabic"
                            : "Missing")
                        }
                      />
                    </div>
                    {isEditing && (
                      <div className="mt-4 rounded-xl border border-border bg-muted p-4">
                        <label className="grid gap-2 text-xs font-semibold">
                          Translation
                          <textarea
                            autoFocus
                            className="min-h-24 rounded-lg border border-border bg-card p-3 text-sm outline-none focus:border-border"
                            dir={
                              selectedLocale.startsWith("ar") ? "rtl" : "ltr"
                            }
                            onChange={(event) => setValue(event.target.value)}
                            value={value}
                          />
                        </label>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                          <span className="text-[11px] text-outline">
                            Placeholders:{" "}
                            {Object.keys(key.placeholderSchema).join(", ") ||
                              "none"}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              disabled={busy}
                              onClick={() => setEditingKey("")}
                              variant="outline"
                            >
                              Cancel
                            </Button>
                            <Button
                              className="bg-foreground text-on-tone"
                              disabled={busy || !value.trim()}
                              onClick={() => void saveTranslation()}
                            >
                              Save draft
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
              {!filteredKeys.length && (
                <div className="grid min-h-56 place-items-center p-8 text-center text-sm text-outline">
                  No localization keys match these filters.
                </div>
              )}
            </div>
          )}
          {!loading && filteredKeys.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <div className="flex items-center gap-3 text-xs text-outline">
                <span>
                  Showing {pageStart + 1}-
                  {Math.min(pageStart + pageSize, filteredKeys.length)} of{" "}
                  {filteredKeys.length}
                </span>
                <label className="flex items-center gap-2">
                  Rows
                  <select
                    className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground"
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    value={pageSize}
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-1">
                <button
                  aria-label="Previous page"
                  className="grid size-9 place-items-center rounded-lg border border-border bg-card disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  type="button"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {paginationItems(currentPage, totalPages).map((item, index) =>
                  item === "ellipsis" ? (
                    <span
                      className="grid size-9 place-items-center text-xs text-outline"
                      key={`ellipsis-${index}`}
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      aria-current={item === currentPage ? "page" : undefined}
                      className={cn(
                        "grid size-9 place-items-center rounded-lg text-xs font-semibold",
                        item === currentPage
                          ? "bg-foreground text-on-tone"
                          : "border border-border bg-card hover:bg-muted",
                      )}
                      key={item}
                      onClick={() => setPage(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  ),
                )}
                <button
                  aria-label="Next page"
                  className="grid size-9 place-items-center rounded-lg border border-border bg-card disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                  type="button"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="grid gap-5 xl:sticky xl:top-20">
          <section className="rounded-2xl bg-foreground p-5 text-on-tone shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-card/10">
                <Languages className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold">Release control</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedLocale} · v{detail?.version ?? "—"}
                </p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-card/5 p-3">
                <dt className="text-muted-foreground">Coverage</dt>
                <dd className="mt-1 text-lg font-bold">
                  {selectedPack?.coverage ?? 0}%
                </dd>
              </div>
              <div className="rounded-xl bg-card/5 p-3">
                <dt className="text-muted-foreground">Affected tenants</dt>
                <dd className="mt-1 text-lg font-bold">
                  {selectedPack?.affectedTenants ?? 0}
                </dd>
              </div>
              <div className="rounded-xl bg-card/5 p-3">
                <dt className="text-muted-foreground">Changed values</dt>
                <dd className="mt-1 text-lg font-bold">{changedCount}</dd>
              </div>
              <div className="rounded-xl bg-card/5 p-3">
                <dt className="text-muted-foreground">Fallback parent</dt>
                <dd className="mt-1 text-lg font-bold">
                  {detail?.parentLocale ?? "—"}
                </dd>
              </div>
            </dl>
            <div className="mt-5 grid gap-2">
              {canReview && detail?.status === "DRAFT" && (
                <Button
                  className="w-full bg-card text-foreground"
                  disabled={busy}
                  onClick={() => void runAction("review")}
                >
                  <Send className="size-4" /> Submit for review
                </Button>
              )}
              {canPublish && detail?.status === "REVIEW" && (
                <Button
                  className="w-full bg-accent text-foreground"
                  disabled={
                    busy || (selectedLocale === "ar" && detail.coverage < 100)
                  }
                  onClick={() => void runAction("publish")}
                >
                  <ShieldCheck className="size-4" /> Publish release
                </Button>
              )}
              {detail?.status === "PUBLISHED" && (
                <div className="flex items-center gap-2 rounded-xl border bg-accent/10 border-accent/40 p-3 text-xs text-foreground">
                  <Check className="size-4" /> Current published release
                </div>
              )}
              {canPublish &&
                detail &&
                ["DRAFT", "REVIEW"].includes(detail.status) && (
                  <Button
                    className="w-full border-on-tone/20 text-on-tone"
                    disabled={busy}
                    onClick={() => void archive(detail.version)}
                    variant="outline"
                  >
                    <ArchiveIcon className="size-4" /> Archive this version
                  </Button>
                )}
            </div>
          </section>

          <section
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            dir={selectedLocale.startsWith("ar") ? "rtl" : "ltr"}
            lang={selectedLocale}
          >
            <div className="border-b border-border p-4">
              <h2 className="font-semibold">Dashboard preview</h2>
              <p className="text-xs text-outline">
                Inheritance applied for missing regional values
              </p>
            </div>
            <div className="bg-muted p-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider theme-tone-text">
                  {resolvedMessage(
                    detail,
                    baseArabic,
                    "tenant.dashboard.header.eyebrow",
                    "Workspace operations",
                  )}
                </p>
                <h3 className="mt-1 text-xl font-bold">
                  {resolvedMessage(
                    detail,
                    baseArabic,
                    "tenant.dashboard.header.title",
                    "HR operations",
                  )}
                </h3>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    ["attendance.status.present", "Present", "18"],
                    ["attendance.status.late", "Late", "2"],
                  ].map(([key, fallback, count]) => (
                    <div
                      className="rounded-lg border border-border p-3"
                      key={key}
                    >
                      <span className="text-[10px] text-outline">
                        {resolvedMessage(detail, baseArabic, key, fallback)}
                      </span>
                      <strong className="mt-1 block text-xl">{count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">Version history</h2>
            <div className="mt-3 grid gap-2">
              {selectedPack?.versions.map((version) => (
                <div
                  className="flex items-center justify-between rounded-xl bg-muted p-3"
                  key={version.version}
                >
                  <div>
                    <strong className="text-sm">
                      Version {version.version}
                    </strong>
                    <div className="text-[10px] text-outline">
                      {version.status}
                    </div>
                  </div>
                  {version.status === "ARCHIVED" && canPublish && (
                    <button
                      aria-label={`Restore version ${version.version}`}
                      className="grid size-8 place-items-center rounded-lg border border-border bg-card"
                      disabled={busy}
                      onClick={() => void rollback(version.version)}
                      title={`Restore version ${version.version}`}
                      type="button"
                    >
                      <RotateCcw className="size-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PackStatusBadge({ status }: { status: PackStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 text-[10px] font-bold",
        status === "PUBLISHED" && "theme-tone theme-tone-emerald",
        status === "REVIEW" && "bg-muted text-foreground",
        status === "DRAFT" && "theme-tone theme-tone-amber",
        status === "ARCHIVED" && "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

function MessageCell({
  label,
  value,
  direction = "ltr",
  missing = false,
}: {
  label: string;
  value: string;
  direction?: "ltr" | "rtl";
  missing?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        missing
          ? "border-dashed theme-tone theme-tone-amber border"
          : "border-border bg-muted",
      )}
    >
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-outline">
        {missing && <CircleAlert className="size-3 theme-tone-text" />}
        {label}
      </div>
      <p className="mt-2 text-sm" dir={direction}>
        {value}
      </p>
    </div>
  );
}

function resolvedMessage(
  detail: PackDetail | null,
  baseArabic: Map<string, string>,
  keyName: string,
  fallback: string,
) {
  const key = detail?.keys.find(({ key }) => key === keyName);
  return (
    key?.translation?.value ||
    (detail?.locale.startsWith("ar") ? baseArabic.get(keyName) : undefined) ||
    key?.defaultMessage ||
    fallback
  );
}

function parseTranslationFile(content: string, csv: boolean) {
  if (!csv) {
    const parsed = JSON.parse(content) as
      | {
          translations?: Array<{ key: string; value: string }>;
        }
      | Array<{ key: string; value: string }>;
    const rows = Array.isArray(parsed) ? parsed : parsed.translations;
    if (!Array.isArray(rows)) throw new Error("Missing translations array");
    return rows;
  }
  const rows = parseCsv(content);
  const [header, ...values] = rows;
  const keyIndex = header?.indexOf("key") ?? -1;
  const valueIndex = header?.indexOf("value") ?? -1;
  if (keyIndex < 0 || valueIndex < 0) throw new Error("Missing CSV columns");
  return values
    .filter((row) => row[keyIndex])
    .map((row) => ({ key: row[keyIndex], value: row[valueIndex] ?? "" }));
}

function parseCsv(content: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && content[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function paginationItems(page: number, totalPages: number) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const visible = [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];
  for (const value of visible) {
    const previous = result.at(-1);
    if (typeof previous === "number" && value - previous > 1) {
      result.push("ellipsis");
    }
    result.push(value);
  }
  return result;
}

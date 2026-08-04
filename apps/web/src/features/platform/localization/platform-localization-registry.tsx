"use client";

import {
  ArrowRight,
  Check,
  Languages,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import { platformApiClient } from "@/lib/platform-api-client";
import { usePlatformAuthStore } from "@/lib/platform-auth-store";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

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
};

const supportedLanguages = [
  {
    locale: "en",
    displayName: "English",
    nativeName: "English",
    direction: "LTR",
    parentLocale: null,
  },
  {
    locale: "ar",
    displayName: "Arabic",
    nativeName: "العربية",
    direction: "RTL",
    parentLocale: "en",
  },
  {
    locale: "ar-OM",
    displayName: "Arabic (Oman)",
    nativeName: "العربية (عُمان)",
    direction: "RTL",
    parentLocale: "ar",
  },
  {
    locale: "ar-AE",
    displayName: "Arabic (UAE)",
    nativeName: "العربية (الإمارات)",
    direction: "RTL",
    parentLocale: "ar",
  },
] as const;

export function PlatformLocalizationRegistry() {
  const permissions = usePlatformAuthStore(
    (state) => state.user?.permissions ?? [],
  );
  const canTranslate = permissions.includes("platform.localization.translate");
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadPacks() {
    const { data } = await platformApiClient.get<{ data: PackSummary[] }>(
      "/platform/localization/packs",
    );
    setPacks(
      [...data.data].sort(
        (left, right) =>
          supportedLanguages.findIndex(
            ({ locale }) => locale === left.locale,
          ) -
          supportedLanguages.findIndex(
            ({ locale }) => locale === right.locale,
          ),
      ),
    );
  }

  useEffect(() => {
    let active = true;
    // The registry hydrates its API-backed state once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPacks()
      .catch((requestError) => {
        if (active) {
          setError(
            getApiErrorMessage(
              requestError,
              "The language registry could not be loaded.",
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

  const configuredLocales = new Set(packs.map(({ locale }) => locale));
  const availableLanguages = supportedLanguages.filter(
    ({ locale }) => !configuredLocales.has(locale),
  );
  const normalizedQuery = query.trim().toLowerCase();
  const visiblePacks = packs.filter(
    (pack) =>
      !normalizedQuery ||
      pack.locale.toLowerCase().includes(normalizedQuery) ||
      pack.displayName.toLowerCase().includes(normalizedQuery) ||
      pack.nativeName.toLowerCase().includes(normalizedQuery),
  );
  const publishedCount = packs.filter(
    ({ status }) => status === "PUBLISHED",
  ).length;
  const averageCoverage = packs.length
    ? Math.round(
        packs.reduce((total, pack) => total + pack.coverage, 0) / packs.length,
      )
    : 0;

  async function createLanguage() {
    if (!selectedLocale) return;
    setBusy(true);
    setError("");
    try {
      await platformApiClient.post("/platform/localization/packs", {
        locale: selectedLocale,
      });
      await loadPacks();
      setSelectedLocale("");
      setAddOpen(false);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "The language could not be added."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] p-5 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-600">
            Product language operations
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Languages</h1>
          <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">
            Manage supported interface languages, regional variants, and their
            published translation coverage.
          </p>
        </div>
        {canTranslate && (
          <Button
            className="bg-zinc-950 text-white"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-4" />
            Add language
          </Button>
        )}
      </header>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="mt-7 grid gap-3 sm:grid-cols-3">
        <RegistryMetric
          label="Configured languages"
          value={packs.length}
        />
        <RegistryMetric label="Published" value={publishedCount} />
        <RegistryMetric
          label="Average coverage"
          suffix="%"
          value={averageCoverage}
        />
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 p-4">
          <div>
            <h2 className="font-semibold">Language registry</h2>
            <p className="mt-0.5 text-xs text-outline">
              Open a language to edit translations and manage releases.
            </p>
          </div>
          <label className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline" />
            <input
              aria-label="Search languages"
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-3 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search languages..."
              value={query}
            />
          </label>
        </div>

        <div className="hidden grid-cols-[minmax(260px,1.5fr)_110px_160px_130px_130px_90px] gap-4 border-b border-zinc-100 bg-zinc-50 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-outline lg:grid">
          <span>Language</span>
          <span>Direction</span>
          <span>Coverage</span>
          <span>Status</span>
          <span>Tenants</span>
          <span className="text-right">Action</span>
        </div>

        {loading ? (
          <div className="grid gap-2 p-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                className="h-20 animate-pulse rounded-xl bg-zinc-50"
                key={item}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {visiblePacks.map((pack) => (
              <Link
                className="group grid min-h-20 items-center gap-4 px-5 py-4 transition hover:bg-zinc-50 lg:grid-cols-[minmax(260px,1.5fr)_110px_160px_130px_130px_90px]"
                href={`/platform/localization/${encodeURIComponent(pack.locale)}`}
                key={pack.locale}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-100 text-sm font-bold text-zinc-800">
                    {pack.locale}
                  </span>
                  <div className="min-w-0">
                    <strong className="block truncate">{pack.displayName}</strong>
                    <span
                      className="mt-0.5 block truncate text-xs text-outline"
                      dir={pack.direction === "RTL" ? "rtl" : "ltr"}
                      lang={pack.locale}
                    >
                      {pack.nativeName} · Version {pack.version}
                    </span>
                  </div>
                </div>
                <span className="text-sm text-on-surface-variant">
                  {pack.direction}
                </span>
                <div>
                  <div className="text-xs">{pack.coverage}% complete</div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        pack.coverage === 100
                          ? "bg-emerald-500"
                          : "bg-amber-500",
                      )}
                      style={{ width: `${pack.coverage}%` }}
                    />
                  </div>
                </div>
                <PackStatusBadge status={pack.status} />
                <span className="text-sm text-on-surface-variant">
                  {pack.affectedTenants}
                </span>
                <span className="flex items-center justify-end gap-2 text-sm font-semibold">
                  Open
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
            {!visiblePacks.length && (
              <div className="grid min-h-48 place-items-center p-8 text-center">
                <div>
                  <Languages className="mx-auto size-6 text-outline" />
                  <p className="mt-3 text-sm font-semibold">
                    No languages match your search
                  </p>
                  <p className="mt-1 text-xs text-outline">
                    Clear the search to view the full registry.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <Dialog onOpenChange={setAddOpen} open={addOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add language</DialogTitle>
            <DialogDescription>
              Add a supported language pack. It starts as a draft and inherits
              translations from its fallback language.
            </DialogDescription>
          </DialogHeader>
          {availableLanguages.length ? (
            <div className="grid gap-2 py-2">
              {availableLanguages.map((language) => (
                <button
                  className={cn(
                    "flex min-h-16 items-center justify-between rounded-xl border p-3 text-left transition",
                    selectedLocale === language.locale
                      ? "border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900/10"
                      : "border-zinc-200 hover:border-zinc-400",
                  )}
                  key={language.locale}
                  onClick={() => setSelectedLocale(language.locale)}
                  type="button"
                >
                  <div>
                    <strong className="text-sm">{language.displayName}</strong>
                    <p
                      className="mt-0.5 text-xs text-outline"
                      dir={language.direction === "RTL" ? "rtl" : "ltr"}
                    >
                      {language.nativeName} · {language.locale}
                    </p>
                  </div>
                  {selectedLocale === language.locale && (
                    <Check className="size-4" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="my-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 text-emerald-700" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    Registry complete
                  </p>
                  <p className="mt-1 text-xs leading-5 text-emerald-800">
                    All currently supported languages are already configured.
                    New locales require a supported locale definition before
                    they can be added here.
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setAddOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              className="bg-zinc-950 text-white"
              disabled={!selectedLocale || busy}
              onClick={() => void createLanguage()}
            >
              Add language
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RegistryMetric({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-outline">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">
        {value}
        {suffix}
      </p>
    </div>
  );
}

function PackStatusBadge({ status }: { status: PackStatus }) {
  return (
    <span
      className={cn(
        "w-fit rounded-full px-2.5 py-1 text-[10px] font-bold",
        status === "PUBLISHED" && "bg-emerald-100 text-emerald-700",
        status === "REVIEW" && "bg-[#ede7dc] text-[#151515]",
        status === "DRAFT" && "bg-amber-100 text-amber-800",
        status === "ARCHIVED" && "bg-zinc-100 text-zinc-600",
      )}
    >
      {status}
    </span>
  );
}

"use client";

import { ArrowRight, Boxes, Search, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  resolvePlatformNavigationHref,
  usePlatformProductNavigation,
} from "@/lib/platform-product-navigation";
import { useTenantLocalization } from "@/lib/tenant-localization";

export function PortalSearch() {
  const router = useRouter();
  const { t, locale } = useTenantLocalization();
  const { items } = usePlatformProductNavigation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();

  const destinations = useMemo(
    () => [
      ...items
        .filter(({ requiredProduct }) => requiredProduct)
        .map((item) => ({
          key: item.key,
          label:
            item.requiredProduct === "HRMS"
              ? t("tenant.navigation.hrms", "HRMS")
              : item.requiredProduct ?? item.key,
          href: resolvePlatformNavigationHref(item.hrefTemplate, locale),
          external: true,
          icon: Boxes,
        })),
      {
        key: "company",
        label: t("tenant.navigation.company", "Company"),
        href: "/app/settings/company",
        external: false,
        icon: Settings2,
      },
      {
        key: "access",
        label: t("tenant.navigation.adminAccess", "Admin access"),
        href: "/app/settings/access",
        external: false,
        icon: Settings2,
      },
      {
        key: "billing",
        label: t("tenant.navigation.billing", "Billing"),
        href: "/app/settings/billing",
        external: false,
        icon: Settings2,
      },
    ],
    [items, locale, t],
  );
  const visible = normalizedQuery
    ? destinations.filter(({ label }) =>
        label.toLowerCase().includes(normalizedQuery),
      )
    : destinations.slice(0, 5);

  function navigate(href: string, external: boolean) {
    setOpen(false);
    setQuery("");
    if (external) window.location.assign(href);
    else router.push(href);
  }

  return (
    <div className="relative w-full max-w-xl" role="search">
      <Search className="absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        aria-label={t("tenant.search.label", "Search products or settings")}
        autoComplete="off"
        className="h-10 w-full rounded-lg border border-border bg-muted/70 ps-11 pe-24 text-sm outline-none transition placeholder:text-muted-foreground hover:bg-card focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/20"
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={t(
          "tenant.search.placeholder",
          "Search products and settings...",
        )}
        value={query}
      />
      <span className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground lg:inline-flex">
        /
      </span>
      {open && (
        <div className="absolute inset-x-0 top-12 z-50 max-h-96 overflow-y-auto rounded-lg border border-border bg-card p-2 shadow-xl">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {normalizedQuery
              ? t("tenant.search.results", "Results")
              : t("tenant.search.quickOpen", "Quick open")}
          </div>
          {visible.map(({ key, label, href, external, icon: Icon }) => (
            <button
              className="flex min-h-12 w-full items-center gap-3 rounded-lg p-3 text-start transition hover:bg-muted"
              key={key}
              onMouseDown={() => navigate(href, external)}
              type="button"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-muted text-foreground">
                <Icon className="size-4" />
              </span>
              <strong className="min-w-0 flex-1 truncate text-sm">{label}</strong>
              <ArrowRight className="directional-icon size-4 text-muted-foreground" />
            </button>
          ))}
          {visible.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t("tenant.search.noResults", "No matching products or settings")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

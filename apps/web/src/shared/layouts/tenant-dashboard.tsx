"use client";

import {
  ArrowRight,
  Boxes,
  Building2,
  CheckCircle2,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth-store";
import {
  resolvePlatformNavigationHref,
  usePlatformProductNavigation,
} from "@/lib/platform-product-navigation";
import { useTenantLocalization } from "@/lib/tenant-localization";
import { LoadingState } from "@/shared/components/page-primitives";

export function TenantDashboard() {
  const user = useAuthStore((state) => state.user);
  const { t, locale } = useTenantLocalization();
  const { items, loaded } = usePlatformProductNavigation(Boolean(user));
  const products = items.filter(({ requiredProduct }) => requiredProduct);

  if (!user || !loaded) {
    return (
      <div className="mx-auto max-w-6xl p-5 lg:p-8">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="tenant-page-pattern min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8 lg:py-12">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {t("tenant.platform.eyebrow", "Workspace platform")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
            {t("tenant.platform.welcome", "Welcome to {company}", {
              company: user.companyName ?? "Liqaa",
            })}
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            {t(
              "tenant.platform.description",
              "Open the products enabled for this workspace or manage shared company settings.",
            )}
          </p>
        </div>

        <section aria-labelledby="workspace-products-heading">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2
                className="text-xl font-semibold text-foreground"
                id="workspace-products-heading"
              >
                {t("tenant.platform.products", "Your products")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "tenant.platform.productsDescription",
                  "Product access follows your subscription and assigned role.",
                )}
              </p>
            </div>
          </div>

          {products.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {products.map((product) => {
                const isOnboardingPending =
                  product.requiredProduct === "HRMS" && !user?.onboardingCompletedAt;
                const href = isOnboardingPending
                  ? `/${locale}/app/hrms/onboarding`
                  : resolvePlatformNavigationHref(product.hrefTemplate, locale);
                const name =
                  product.requiredProduct === "HRMS"
                    ? t("tenant.navigation.hrms", "HRMS")
                    : product.requiredProduct ?? product.key;
                return (
                  <a
                    className="group flex min-h-44 flex-col justify-between rounded-xl border border-border bg-card p-6 transition hover:border-primary hover:shadow-sm"
                    href={href}
                    key={product.key}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Boxes className="size-5" />
                      </span>
                      <CheckCircle2 className="size-5 text-success" />
                    </div>
                    <div className="mt-8 flex items-end justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {name}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {isOnboardingPending
                            ? "Setup required — Click to configure"
                            : t(
                                "tenant.platform.productReady",
                                "Enabled and ready to open",
                              )}
                        </p>
                      </div>
                      <ArrowRight className="directional-icon size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary rtl:group-hover:-translate-x-1" />
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <Boxes className="mx-auto size-8 text-muted-foreground" />
              <h3 className="mt-4 font-semibold text-foreground">
                {t("tenant.platform.noProducts", "No products enabled")}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  "tenant.platform.noProductsDescription",
                  "Ask your workspace administrator to activate a product for your account.",
                )}
              </p>
            </div>
          )}
        </section>

        <section
          aria-labelledby="workspace-management-heading"
          className="mt-10"
        >
          <h2
            className="text-xl font-semibold text-foreground"
            id="workspace-management-heading"
          >
            {t("tenant.platform.workspaceManagement", "Workspace management")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ManagementLink
              description={t(
                "tenant.platform.companyDescription",
                "Identity, locale and company profile",
              )}
              href="/app/settings/company"
              icon={Building2}
              label={t("tenant.navigation.company", "Company")}
            />
            <ManagementLink
              description={t(
                "tenant.platform.accessDescription",
                "Administrators, roles and permissions",
              )}
              href="/app/settings/access"
              icon={ShieldCheck}
              label={t("tenant.navigation.adminAccess", "Admin access")}
            />
            <ManagementLink
              description={t(
                "tenant.platform.settingsDescription",
                "Billing, integrations and audit history",
              )}
              href="/app/settings"
              icon={Settings2}
              label={t("tenant.navigation.settings", "Settings")}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function ManagementLink({
  description,
  href,
  icon: Icon,
  label,
}: {
  description: string;
  href: string;
  icon: typeof Settings2;
  label: string;
}) {
  return (
    <Link
      className="group rounded-xl border border-border bg-card p-5 transition hover:border-primary"
      href={href}
    >
      <Icon className="size-5 text-primary" />
      <h3 className="mt-5 font-semibold text-foreground">{label}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

"use client";

import {
  BellRing,
  Building2,
  ChevronRight,
  CreditCard,
  Languages,
  Plug,
  ScrollText,
  ShieldCheck,
  Grid2X2,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useTenantLocalization } from "@/lib/tenant-localization";
import {
  resolvePlatformNavigationHref,
  usePlatformProductNavigation,
} from "@/lib/platform-product-navigation";
import {
  AdminPage,
  ErrorState,
  LoadingState,
  Panel,
} from "@/shared/components/page-primitives";

type IntegrationProvider = {
  key: string;
  name: string;
  status: "CONFIGURED" | "AVAILABLE" | "NOT_ENABLED" | "NEEDS_CONFIGURATION";
  message: string;
};

export function PlatformSettingsHub() {
  const { tText } = useTenantLocalization();
  const permissions = new Set(useAuthStore((state) => state.user?.permissions ?? []));
  const settingsLinks = [
    { title: tText("Company"), description: tText("Workspace identity, branding, timezone and locale."), href: "/app/settings/company", icon: Building2, permissions: ["workspace.settings.read"] },
    { title: tText("Admin access"), description: tText("Workspace accounts, roles and permission assignments."), href: "/app/settings/access", icon: ShieldCheck, permissions: ["identity.roles.read"] },
    { title: tText("Products"), description: tText("Open products enabled for this workspace."), href: "/app/settings/modules", icon: Grid2X2, permissions: [] },
    { title: tText("Audit history"), description: tText("Review attributed workspace and access changes."), href: "/app/settings/audit", icon: ScrollText, permissions: ["workspace.audit.read"] },
    { title: tText("Notifications"), description: tText("Control optional notifications for your account."), href: "/app/settings/notifications", icon: BellRing, permissions: ["notifications.self"] },
    { title: tText("Language & localization"), description: tText("Choose the workspace language policy and locale."), href: "/app/settings/localization", icon: Languages, permissions: ["workspace.settings.read"] },
    { title: tText("Integrations"), description: tText("View deployment-managed Platform services."), href: "/app/settings/integrations", icon: Plug, permissions: ["workspace.settings.read"] },
    { title: tText("Billing"), description: tText("Review subscription, seats, invoices and payment details."), href: "/app/settings/billing", icon: CreditCard, permissions: ["billing.subscription.read"] },
  ];
  const visibleLinks = settingsLinks.filter(
    ({ permissions: required }) => required.length === 0 || required.some((permission) => permissions.has(permission)),
  );

  return (
    <AdminPage
      description={tText("Manage shared workspace identity, access, products, governance and subscription settings.")}
      title={tText("Settings")}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleLinks.map(({ description, href, icon: Icon, title }) => (
          <Link className="group rounded-2xl border border-border bg-card p-6 transition hover:border-primary" href={href} key={href}>
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-muted text-primary"><Icon className="size-5" /></span>
              <ChevronRight className="size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
            </div>
            <h2 className="mt-5 font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </Link>
        ))}
      </div>
    </AdminPage>
  );
}

export function ProductSettingsView() {
  const { locale, tText } = useTenantLocalization();
  const { items, loaded } = usePlatformProductNavigation();
  return (
    <AdminPage description={tText("Products available to this workspace are controlled by Platform entitlements.")} title={tText("Your products")}>
      {!loaded ? <LoadingState /> : items.length === 0 ? (
        <Panel className="p-6 text-sm text-muted-foreground">{tText("No products are currently enabled for this workspace.")}</Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <a className="group rounded-2xl border border-border bg-card p-6 hover:border-primary" href={resolvePlatformNavigationHref(item.hrefTemplate, locale)} key={item.key}>
              <div className="flex items-center justify-between gap-3">
                <strong>{tText(item.key)}</strong>
                <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{tText("Open product workspace")}</p>
            </a>
          ))}
        </div>
      )}
    </AdminPage>
  );
}

export function PlatformIntegrationSettingsView() {
  const { tText } = useTenantLocalization();
  const [providers, setProviders] = useState<IntegrationProvider[] | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .get<{ data: { providers: IntegrationProvider[]; note: string } }>("/workspace/integrations")
      .then(({ data }) => {
        setProviders(data.data.providers);
        setNote(data.data.note);
      })
      .catch(() => setError(tText("Integration diagnostics could not be loaded.")));
  }, []);

  return (
    <AdminPage description={tText("View deployment-managed Platform services without exposing provider credentials.")} title={tText("Integrations")}>
      {error && <ErrorState message={error} />}
      {!providers ? <LoadingState /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((provider) => (
            <Panel className="p-6" key={provider.key}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">{provider.name}</h2>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{provider.status}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{provider.message}</p>
            </Panel>
          ))}
        </div>
      )}
      {note && <p className="mt-5 text-sm text-muted-foreground">{note}</p>}
    </AdminPage>
  );
}

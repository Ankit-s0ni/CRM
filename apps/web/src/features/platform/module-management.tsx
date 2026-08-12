"use client";

import { Boxes, CheckCircle2, Search, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { platformApiClient } from "@/lib/platform-api-client";
import type {
  EffectiveProductEntitlements,
  RegisteredProduct,
  TenantListItem,
} from "@/lib/platform-types";
import { Input } from "@/shared/ui/input";

export function ModuleManagement() {
  const [products, setProducts] = useState<RegisteredProduct[]>([]);
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [entitlements, setEntitlements] = useState<Record<string, EffectiveProductEntitlements>>({});
  const [selectedKey, setSelectedKey] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      platformApiClient.get<RegisteredProduct[]>("/platform/products"),
      platformApiClient.get<{ data: TenantListItem[] }>("/platform/tenants", {
        params: { page: 1, limit: 100 },
      }),
    ])
      .then(async ([productResponse, tenantResponse]) => {
        if (!active) return;
        const productRows = productResponse.data;
        const tenantRows = tenantResponse.data.data;
        setProducts(productRows);
        setTenants(tenantRows);
        setSelectedKey(productRows[0]?.productKey ?? "");
        const snapshots = await Promise.all(
          tenantRows.map(async (tenant) => [
            tenant.id,
            (
              await platformApiClient.get<EffectiveProductEntitlements>(
                `/platform/tenants/${tenant.id}/product-entitlements`,
              )
            ).data,
          ] as const),
        );
        if (active) setEntitlements(Object.fromEntries(snapshots));
      })
      .catch(() => active && setError("The dynamic product registry could not be loaded."));
    return () => { active = false; };
  }, []);

  const selected = products.find(({ productKey }) => productKey === selectedKey) ?? products[0];
  const filteredTenants = useMemo(
    () => tenants.filter((tenant) => `${tenant.companyName} ${tenant.subdomain}`.toLowerCase().includes(search.toLowerCase())),
    [search, tenants],
  );

  return (
    <div className="mx-auto max-w-[1500px] p-5 lg:p-8">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Dynamic registry</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Product catalog & entitlements</h1>
        <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">
          Products come from signed manifests. Capabilities and limits come from plans; tenant overrides are calculated exceptions.
        </p>
      </header>
      {error && <div className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <div className="grid gap-5 xl:grid-cols-[330px_1fr]">
        <aside className="rounded-2xl border border-outline-variant bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Registered products</h2>
          <div className="mt-4 space-y-2">
            {products.map((product) => (
              <button
                className={`w-full rounded-xl border p-4 text-left ${selected?.productKey === product.productKey ? "border-primary bg-primary/5" : "border-outline-variant"}`}
                key={product.id}
                onClick={() => setSelectedKey(product.productKey)}
              >
                <div className="flex items-center gap-3"><Boxes className="size-5 text-primary" /><strong>{product.displayName}</strong></div>
                <div className="mt-2 flex items-center justify-between text-xs text-outline"><span>{product.productKey}</span><span>{product.status}</span></div>
              </button>
            ))}
          </div>
        </aside>
        <main className="space-y-5">
          {selected && <ProductDetails product={selected} />}
          <section className="overflow-hidden rounded-2xl border border-outline-variant bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant p-5">
              <div><h2 className="font-semibold">Calculated tenant access</h2><p className="text-xs text-outline">Read-only result of subscription, plan grants, product state, and bounded overrides.</p></div>
              <div className="relative w-64"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter tenants" /></div>
            </div>
            <div className="divide-y divide-outline-variant">
              {filteredTenants.map((tenant) => {
                const snapshot = entitlements[tenant.id];
                const product = snapshot?.products.find(({ key }) => key === selected?.productKey);
                return <div className="grid gap-3 p-4 md:grid-cols-[1.2fr_.7fr_1.6fr_.8fr]" key={tenant.id}>
                  <div><strong className="text-sm">{tenant.companyName}</strong><div className="text-xs text-outline">{tenant.subdomain}</div></div>
                  <div className="flex items-center gap-2 text-sm">{product?.active ? <CheckCircle2 className="size-4 text-emerald-600" /> : <ShieldAlert className="size-4 text-outline" />}{product?.active ? "Entitled" : "Not entitled"}</div>
                  <div className="text-xs text-on-surface-variant">{Object.entries(product?.capabilities ?? {}).filter(([, enabled]) => enabled).map(([key]) => key).join(", ") || "No capabilities"}</div>
                  <div className="text-xs text-outline">v{snapshot?.version ?? "–"} · {snapshot?.subscriptionStatus ?? "NONE"}</div>
                </div>;
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function ProductDetails({ product }: { product: RegisteredProduct }) {
  const manifest = product.activeRevision?.manifest;
  return <section className="rounded-2xl border border-outline-variant bg-card p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{product.displayName}</h2><p className="mt-1 text-sm text-outline">{product.description}</p></div><div className="rounded-lg bg-muted px-3 py-2 text-xs">Manifest {product.activeRevision?.manifestVersion ?? "not active"}</div></div>
    <div className="mt-5 grid gap-3 md:grid-cols-3"><Fact label="Audience" value={product.audience} /><Fact label="Web route" value={product.webPath} /><Fact label="API prefix" value={product.apiPrefix} /></div>
    <div className="mt-5 grid gap-5 lg:grid-cols-3">
      <Descriptor title="Capabilities" values={product.capabilities.map((item) => `${item.key}${item.required ? " · core" : ""}`)} />
      <Descriptor title="Limits" values={product.limits.map((item) => `${item.key} · ${item.unit} · ${item.enforcement}`)} />
      <Descriptor title="Permissions" values={product.permissions.map((item) => item.key)} />
    </div>
    <div className="mt-5 grid gap-3 md:grid-cols-3"><Fact label="Lifecycle" value={manifest?.lifecycle.mode ?? "–"} /><Fact label="Locales" value={manifest?.localization.supportedLocales.join(", ") ?? "–"} /><Fact label="Deployment" value={product.deployments.map((item) => `${item.environment}: ${item.health}`).join(", ") || "Not configured"} /></div>
  </section>;
}

function Fact({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-muted p-3"><div className="text-[10px] font-bold uppercase text-outline">{label}</div><div className="mt-1 break-all text-sm font-medium">{value}</div></div>; }
function Descriptor({ title, values }: { title: string; values: string[] }) { return <div><h3 className="text-sm font-semibold">{title}</h3><div className="mt-2 max-h-40 space-y-1 overflow-auto">{values.map((value) => <div className="rounded bg-muted px-2 py-1 text-[11px]" key={value}>{value}</div>)}</div></div>; }

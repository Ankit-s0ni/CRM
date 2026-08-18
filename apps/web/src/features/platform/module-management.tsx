"use client";

import {
  Boxes,
  CheckCircle2,
  FileCode2,
  Plus,
  Search,
  ShieldAlert,
  UploadCloud,
  X,
} from "lucide-react";
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
  const [entitlements, setEntitlements] = useState<
    Record<string, EffectiveProductEntitlements>
  >({});
  const [selectedKey, setSelectedKey] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const fetchRegistryData = () => {
    Promise.all([
      platformApiClient.get<RegisteredProduct[]>("/platform/products"),
      platformApiClient.get<{ data: TenantListItem[] }>("/platform/tenants", {
        params: { page: 1, limit: 100 },
      }),
    ])
      .then(async ([productResponse, tenantResponse]) => {
        const productRows = productResponse.data;
        const tenantRows = tenantResponse.data.data;
        setProducts(productRows);
        setTenants(tenantRows);
        if (!selectedKey && productRows[0]) {
          setSelectedKey(productRows[0].productKey);
        }
        const snapshots = await Promise.all(
          tenantRows.map(
            async (tenant) =>
              [
                tenant.id,
                (
                  await platformApiClient.get<EffectiveProductEntitlements>(
                    `/platform/tenants/${tenant.id}/product-entitlements`,
                  )
                ).data,
              ] as const,
          ),
        );
        setEntitlements(Object.fromEntries(snapshots));
      })
      .catch(() => setError("The dynamic product registry could not be loaded."));
  };

  useEffect(() => {
    fetchRegistryData();
  }, []);

  const selected =
    products.find(({ productKey }) => productKey === selectedKey) ?? products[0];
  const filteredTenants = useMemo(
    () =>
      tenants.filter((tenant) =>
        `${tenant.companyName} ${tenant.subdomain}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [search, tenants],
  );

  return (
    <div className="mx-auto max-w-[1500px] p-5 lg:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Dynamic registry
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Product catalog & entitlements
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">
            Products come from signed manifests. Capabilities and limits come from
            plans; tenant overrides are calculated exceptions.
          </p>
        </div>
        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Upload Manifest
        </button>
      </header>

      {error && (
        <div className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[330px_1fr]">
        <aside className="rounded-2xl border border-outline-variant bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Registered products</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              {products.length}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {products.map((product) => (
              <button
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selected?.productKey === product.productKey
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-outline-variant hover:bg-muted/50"
                }`}
                key={product.id}
                onClick={() => setSelectedKey(product.productKey)}
              >
                <div className="flex items-center gap-3">
                  <Boxes className="size-5 text-primary" />
                  <strong>{product.displayName}</strong>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-outline">
                  <span className="font-mono">{product.productKey}</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800">
                    {product.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="space-y-5">
          {selected && <ProductDetails product={selected} />}
          <section className="overflow-hidden rounded-2xl border border-outline-variant bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant p-5">
              <div>
                <h2 className="font-semibold">Calculated tenant access</h2>
                <p className="text-xs text-outline">
                  Read-only result of subscription, plan grants, product state, and
                  bounded overrides.
                </p>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline" />
                <Input
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Filter tenants"
                />
              </div>
            </div>
            <div className="divide-y divide-outline-variant">
              {filteredTenants.map((tenant) => {
                const snapshot = entitlements[tenant.id];
                const product = snapshot?.products.find(
                  ({ key }) => key === selected?.productKey,
                );
                return (
                  <div
                    className="grid gap-3 p-4 md:grid-cols-[1.2fr_.7fr_1.6fr_.8fr]"
                    key={tenant.id}
                  >
                    <div>
                      <strong className="text-sm">{tenant.companyName}</strong>
                      <div className="text-xs text-outline">{tenant.subdomain}</div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {product?.active ? (
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="size-4 text-outline" />
                      )}
                      {product?.active ? "Entitled" : "Not entitled"}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {Object.entries(product?.capabilities ?? {})
                        .filter(([, enabled]) => enabled)
                        .map(([key]) => key)
                        .join(", ") || "No capabilities"}
                    </div>
                    <div className="text-xs text-outline">
                      v{snapshot?.version ?? "–"} ·{" "}
                      {snapshot?.subscriptionStatus ?? "NONE"}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </div>

      {isRegisterModalOpen && (
        <RegisterProductModal
          onClose={() => setIsRegisterModalOpen(false)}
          onSuccess={() => {
            setIsRegisterModalOpen(false);
            fetchRegistryData();
          }}
        />
      )}
    </div>
  );
}

function ProductDetails({ product }: { product: RegisteredProduct }) {
  const manifest = product.activeRevision?.manifest;
  return (
    <section className="rounded-2xl border border-outline-variant bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{product.displayName}</h2>
          <p className="mt-1 text-sm text-outline">{product.description}</p>
        </div>
        <div className="rounded-lg bg-muted px-3 py-2 text-xs font-semibold">
          Manifest {product.activeRevision?.manifestVersion ?? "not active"}
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Fact label="Audience" value={product.audience} />
        <Fact label="Web route" value={product.webPath} />
        <Fact label="API prefix" value={product.apiPrefix} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Descriptor
          title="Capabilities"
          values={product.capabilities.map(
            (item) => `${item.key}${item.required ? " · core" : ""}`,
          )}
        />
        <Descriptor
          title="Limits"
          values={product.limits.map(
            (item) => `${item.key} · ${item.unit} · ${item.enforcement}`,
          )}
        />
        <Descriptor
          title="Permissions"
          values={product.permissions.map((item) => item.key)}
        />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Fact label="Lifecycle" value={manifest?.lifecycle.mode ?? "–"} />
        <Fact
          label="Locales"
          value={manifest?.localization.supportedLocales.join(", ") ?? "–"}
        />
        <Fact
          label="Deployment"
          value={
            product.deployments
              .map((item) => `${item.environment}: ${item.health}`)
              .join(", ") || "Not configured"
          }
        />
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-outline">
        {label}
      </div>
      <div className="mt-1 break-all text-sm font-medium">{value}</div>
    </div>
  );
}

function Descriptor({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-2 max-h-40 space-y-1 overflow-auto">
        {values.map((value) => (
          <div
            className="rounded bg-muted px-2 py-1 font-mono text-[11px]"
            key={value}
          >
            {value}
          </div>
        ))}
      </div>
    </div>
  );
}

function RegisterProductModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [manifestJson, setManifestJson] = useState("");
  const [activate, setActivate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setManifestJson(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const parsed = JSON.parse(manifestJson);
      await platformApiClient.post("/platform/products", {
        manifest: parsed,
        activate,
      });
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON format. Please check your manifest file.");
      } else if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message
      ) {
        setError(
          (err as { response: { data: { message: string } } }).response.data
            .message,
        );
      } else {
        setError("Failed to register product manifest. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-outline-variant bg-card p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-lg p-1 text-outline hover:bg-muted hover:text-on-surface"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <UploadCloud className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Register Product Manifest</h2>
            <p className="text-xs text-outline">
              Upload or paste a Manifest v2 JSON schema to onboard a new product.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-outline">
              Upload JSON File
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="block w-full text-xs text-outline file:mr-4 file:rounded-xl file:border-0 file:bg-muted file:px-4 file:py-2 file:text-xs file:font-semibold file:text-on-surface hover:file:bg-muted/80"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-outline">
              <span>Manifest JSON Content</span>
              <FileCode2 className="size-4" />
            </label>
            <textarea
              required
              rows={9}
              value={manifestJson}
              onChange={(e) => setManifestJson(e.target.value)}
              placeholder={`{\n  "manifestVersion": "2.0.0",\n  "productKey": "MAIL",\n  "displayName": "DeltCRM Mail",\n  "audience": "mail-api",\n  ...\n}`}
              className="w-full rounded-xl border border-outline-variant bg-muted/40 p-3 font-mono text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activate"
              checked={activate}
              onChange={(e) => setActivate(e.target.checked)}
              className="size-4 rounded border-outline-variant text-primary"
            />
            <label htmlFor="activate" className="text-xs font-medium">
              Activate manifest immediately upon registration
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold text-outline hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !manifestJson.trim()}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

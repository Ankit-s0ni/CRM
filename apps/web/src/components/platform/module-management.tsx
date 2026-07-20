"use client";

import {
  Boxes,
  ChevronRight,
  Clock3,
  LockKeyhole,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { platformApiClient } from "@/lib/platform-api-client";
import { usePlatformAuthStore } from "@/lib/platform-auth-store";
import type { PlatformModule, TenantListItem } from "@/lib/platform-types";

const icons = { ATTENDANCE: Clock3, FIELD_TRACKING: MapPin };

export function ModuleManagement() {
  const permissions = usePlatformAuthStore(
    (state) => state.user?.permissions ?? [],
  );
  const [products, setProducts] = useState<PlatformModule[]>([]);
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Set<string>>>(
    {},
  );
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const [catalogResponse, tenantResponse] = await Promise.all([
      platformApiClient.get<{ data: PlatformModule[] }>("/platform/catalog"),
      platformApiClient.get<{ data: TenantListItem[] }>("/platform/tenants", {
        params: { page: 1, limit: 100 },
      }),
    ]);
    setProducts(catalogResponse.data.data);
    setTenants(tenantResponse.data.data);
    setSelected(
      (current) => current || catalogResponse.data.data[0]?.key || "",
    );
    setAssignments(
      catalogAssignments(
        tenantResponse.data.data,
        catalogResponse.data.data,
      ),
    );
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      platformApiClient.get<{ data: PlatformModule[] }>("/platform/catalog"),
      platformApiClient.get<{ data: TenantListItem[] }>("/platform/tenants", {
        params: { page: 1, limit: 100 },
      }),
    ])
      .then(([catalogResponse, tenantResponse]) => {
        if (!active) return;
        setProducts(catalogResponse.data.data);
        setTenants(tenantResponse.data.data);
        setSelected(catalogResponse.data.data[0]?.key || "");
        setAssignments(
          catalogAssignments(
            tenantResponse.data.data,
            catalogResponse.data.data,
          ),
        );
      })
      .catch(() => {
        if (active) setError("The product catalog could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  const availableProducts = products.filter(
    (product) => product.availability === "AVAILABLE",
  );
  const comingSoon = products.filter(
    (product) => product.availability === "COMING_SOON",
  );
  const assignable = availableProducts.flatMap((product) => [
    product,
    ...(product.addOns ?? []).filter(
      (addOn) => addOn.availability === "AVAILABLE",
    ),
  ]);
  const selectedProduct =
    products.find((product) => product.key === selected) ?? products[0];
  const filteredTenants = tenants.filter((tenant) =>
    `${tenant.companyName} ${tenant.subdomain}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  async function toggle(tenantId: string, item: PlatformModule) {
    if (
      !permissions.includes("platform.modules.manage") ||
      item.availability !== "AVAILABLE"
    ) {
      return;
    }
    const current = new Set(assignments[tenantId] ?? []);
    if (current.has(item.key)) {
      current.delete(item.key);
      for (const candidate of assignable) {
        if (candidate.dependencyKeys.includes(item.key))
          current.delete(candidate.key);
      }
    } else {
      current.add(item.key);
      item.dependencyKeys.forEach((key) => current.add(key));
    }
    setBusy(`${tenantId}:${item.key}`);
    setError("");
    try {
      const response = await platformApiClient.put<{ data: PlatformModule[] }>(
        `/platform/tenants/${tenantId}/modules`,
        { moduleKeys: [...current] },
      );
      setAssignments((state) => ({
        ...state,
        [tenantId]: new Set(
          response.data.data
            .filter(
              (module) =>
                module.isActive &&
                assignable.some((item) => item.key === module.key),
            )
            .map((module) => module.key),
        ),
      }));
      await load();
    } catch (cause) {
      const message = (cause as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setError(message || "The tenant entitlement could not be updated.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] p-5 lg:p-8">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Commercial catalog
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Products & entitlements
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
          Products are sold through plans. Tenant overrides are exceptional; HR
          configures the included Attendance features inside each workspace.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <aside className="rounded-2xl border border-outline-variant bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Product Catalog</h2>
          <p className="mt-1 text-xs text-outline">
            Customer-facing products, add-ons and capabilities.
          </p>

          <div className="mt-5 space-y-3">
            {availableProducts.map((product) => (
              <ProductButton
                key={product.id}
                product={product}
                selected={selected === product.key}
                onSelect={setSelected}
              />
            ))}
          </div>

          {comingSoon.length > 0 && (
            <div className="mt-7 border-t border-zinc-100 pt-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-outline">
                <Sparkles className="size-4" /> Coming later
              </div>
              <div className="space-y-2">
                {comingSoon.map((product) => (
                  <div
                    className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 text-sm text-outline"
                    key={product.id}
                  >
                    <LockKeyhole className="size-4" />
                    <span className="font-semibold">{product.name}</span>
                    <span className="ml-auto text-[10px] uppercase">
                      Not sellable
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <main className="space-y-5">
          {selectedProduct && <ProductDetail product={selectedProduct} />}
          <section className="overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-surface-variant p-5">
              <div>
                <h2 className="font-semibold">Tenant product entitlements</h2>
                <p className="mt-1 text-xs text-outline">
                  Only products and commercial add-ons appear here. Attendance
                  features are defined by the selected plan.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline" />
                <Input
                  className="h-9 border-outline-variant pl-9"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Filter tenants..."
                  value={search}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div
                  className="grid border-b border-surface-variant bg-zinc-50 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant"
                  style={{
                    gridTemplateColumns: `240px repeat(${assignable.length}, minmax(150px, 1fr))`,
                  }}
                >
                  <div className="p-4">Tenant</div>
                  {assignable.map((item) => (
                    <div
                      className="border-l border-surface-variant p-4 text-center"
                      key={item.id}
                    >
                      {item.name}
                      {item.kind === "ADD_ON" && (
                        <span className="mt-1 block text-[9px] text-primary">
                          Attendance add-on
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {filteredTenants.map((tenant) => (
                  <div
                    className="grid min-h-20 border-b border-outline-variant last:border-0"
                    key={tenant.id}
                    style={{
                      gridTemplateColumns: `240px repeat(${assignable.length}, minmax(150px, 1fr))`,
                    }}
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="grid size-9 place-items-center rounded-lg bg-surface-variant text-xs font-bold text-primary">
                        {tenant.companyName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">
                          {tenant.companyName}
                        </div>
                        <div className="text-[10px] text-outline">
                          {tenant.subscription?.plan.name || "No plan"}
                        </div>
                      </div>
                    </div>
                    {assignable.map((item) => {
                      const active =
                        assignments[tenant.id]?.has(item.key) ?? false;
                      const disabled =
                        !permissions.includes("platform.modules.manage") ||
                        Boolean(busy);
                      return (
                        <div
                          className="grid place-items-center border-l border-outline-variant"
                          key={item.id}
                        >
                          <button
                            aria-checked={active}
                            aria-label={`${active ? "Disable" : "Enable"} ${item.name} for ${tenant.companyName}`}
                            className={`relative h-6 w-11 rounded-full transition ${
                              active ? "bg-green-600" : "bg-zinc-200"
                            } disabled:opacity-55`}
                            disabled={disabled}
                            onClick={() => void toggle(tenant.id, item)}
                            role="switch"
                            title={
                              item.dependencyKeys.length
                                ? `Requires ${item.dependencyKeys.join(", ")}`
                                : ""
                            }
                          >
                            <span
                              className={`absolute top-1 size-4 rounded-full bg-white shadow transition ${
                                active ? "left-6" : "left-1"
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function catalogAssignments(
  tenants: TenantListItem[],
  products: PlatformModule[],
) {
  const assignableKeys = new Set(
    products
      .filter((product) => product.availability === "AVAILABLE")
      .flatMap((product) => [
        product.key,
        ...(product.addOns ?? [])
          .filter((addOn) => addOn.availability === "AVAILABLE")
          .map((addOn) => addOn.key),
      ]),
  );
  return Object.fromEntries(
    tenants.map((tenant) => [
      tenant.id,
      new Set(
        tenant.modules
          .map((module) => module.key)
          .filter((key) => assignableKeys.has(key)),
      ),
    ]),
  );
}

function ProductButton({
  product,
  selected,
  onSelect,
}: {
  product: PlatformModule;
  selected: boolean;
  onSelect: (key: string) => void;
}) {
  const Icon = icons[product.key as keyof typeof icons] ?? Boxes;
  return (
    <button
      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left ${
        selected ? "border-primary bg-zinc-50" : "border-surface-variant"
      }`}
      onClick={() => onSelect(product.key)}
      type="button"
    >
      <span className="grid size-10 place-items-center rounded-lg bg-green-100 text-green-700">
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block text-sm font-semibold">{product.name}</span>
        <span className="text-[10px] uppercase text-green-700">
          Available product
        </span>
      </span>
      <ChevronRight className="ml-auto size-4 text-outline" />
    </button>
  );
}

function ProductDetail({ product }: { product: PlatformModule }) {
  const capabilities = product.capabilities ?? [];
  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            Available product
          </p>
          <h2 className="mt-1 text-xl font-bold">{product.name}</h2>
          <p className="mt-2 text-sm text-on-surface-variant">{product.description}</p>
        </div>
        <div className="rounded-xl bg-zinc-50 px-4 py-2 text-xs font-semibold text-primary">
          {capabilities.length} plan features
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {capabilities.map((capability) => (
          <div
            className="rounded-xl border border-zinc-200 p-4"
            key={capability.id}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 grid size-5 place-items-center rounded-full bg-green-100 text-[10px] font-bold text-green-700">
                ✓
              </span>
              <div>
                <h3 className="text-sm font-semibold">{capability.name}</h3>
                <p className="mt-1 text-xs leading-5 text-outline">
                  {capability.description}
                </p>
                <div className="mt-2 text-[9px] font-bold uppercase tracking-wide text-outline">
                  {capability.isCore
                    ? "Included with Attendance"
                    : "Selectable by plan"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(product.addOns?.length ?? 0) > 0 && (
        <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-primary">
            Optional add-on
          </div>
          {product.addOns?.map((addOn) => (
            <div className="mt-2 flex items-center gap-3" key={addOn.id}>
              <MapPin className="size-5 text-primary" />
              <div>
                <div className="text-sm font-semibold">{addOn.name}</div>
                <div className="text-xs text-outline">
                  {addOn.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

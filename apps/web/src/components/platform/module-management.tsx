"use client";

import { Boxes, ChevronRight, Clock3, MapPin, PackagePlus, Search, WalletCards, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { platformApiClient } from "@/lib/platform-api-client";
import { usePlatformAuthStore } from "@/lib/platform-auth-store";
import type { PlatformModule, TenantListItem } from "@/lib/platform-types";

const icons = { ATTENDANCE: Clock3, FIELD_TRACKING: MapPin, PAYROLL: WalletCards };

export function ModuleManagement() {
  const permissions = usePlatformAuthStore((state) => state.user?.permissions || []);
  const [modules, setModules] = useState<PlatformModule[]>([]);
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Set<string>>>({});
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    try {
      const [{ data: moduleData }, { data: tenantData }] = await Promise.all([
        platformApiClient.get<{ data: PlatformModule[] }>("/platform/modules"),
        platformApiClient.get<{ data: TenantListItem[] }>("/platform/tenants", { params: { page: 1, limit: 100 } }),
      ]);
      setModules(moduleData.data); setTenants(tenantData.data);
      setSelected((value) => value || moduleData.data[0]?.key || "");
      setAssignments(Object.fromEntries(tenantData.data.map((tenant) => [tenant.id, new Set(tenant.modules.map((module) => module.key))])));
    } catch { setError("We couldn't load the module registry."); }
  }
  useEffect(() => {
    let current = true;
    Promise.all([
      platformApiClient.get<{ data: PlatformModule[] }>("/platform/modules"),
      platformApiClient.get<{ data: TenantListItem[] }>("/platform/tenants", { params: { page: 1, limit: 100 } }),
    ]).then(([moduleResponse, tenantResponse]) => {
      if (!current) return;
      setModules(moduleResponse.data.data); setTenants(tenantResponse.data.data);
      setSelected(moduleResponse.data.data[0]?.key || "");
      setAssignments(Object.fromEntries(tenantResponse.data.data.map((tenant) => [tenant.id, new Set(tenant.modules.map((module) => module.key))])));
    }).catch(() => { if (current) setError("We couldn't load the module registry."); });
    return () => { current = false; };
  }, []);

  async function toggle(tenantId: string, module: PlatformModule) {
    if (!permissions.includes("platform.modules.manage") || module.availability !== "AVAILABLE") return;
    const current = new Set(assignments[tenantId] || []);
    if (current.has(module.key)) current.delete(module.key); else { current.add(module.key); module.dependencyKeys.forEach((key) => current.add(key)); }
    setBusy(`${tenantId}:${module.key}`); setError("");
    try {
      const { data } = await platformApiClient.put<{ data: PlatformModule[] }>(`/platform/tenants/${tenantId}/modules`, { moduleKeys: [...current] });
      setAssignments((state) => ({ ...state, [tenantId]: new Set(data.data.filter((item) => item.isActive).map((item) => item.key)) }));
    } catch (requestError) {
      const message = (requestError as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message || "Module assignment could not be updated.");
    } finally { setBusy(""); }
  }

  const filtered = tenants.filter((tenant) => `${tenant.companyName} ${tenant.subdomain}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="mx-auto max-w-[1500px] p-5 lg:p-8">
    <div className="mb-6"><h1 className="text-3xl font-semibold tracking-tight">Module Management</h1><p className="mt-1 text-sm text-[#646273]">Control feature access across tenants from the central registry.</p></div>
    {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-5 xl:grid-cols-[310px_1fr]">
      <aside className="rounded-xl border border-[#ddd9e8] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Module Registry</h2><p className="mt-1 text-xs text-[#777587]">Manage the core feature set.</p></div>{permissions.includes("platform.modules.manage") && <Button size="sm" className="bg-[#3525cd] text-white" onClick={() => setCreateOpen(true)}><PackagePlus />Add Module</Button>}</div><div className="mt-5 space-y-3">{modules.map((module) => { const Icon = icons[module.key as keyof typeof icons] || Boxes; return <button key={module.id} onClick={() => setSelected(module.key)} className={`relative flex w-full items-center gap-3 rounded-xl border p-4 text-left ${selected === module.key ? "border-[#3525cd] bg-[#f7f5ff]" : "border-[#e4e1ee]"}`}><span className={`grid size-10 place-items-center rounded-lg ${module.availability === "AVAILABLE" ? "bg-green-100 text-green-700" : "bg-[#eeeaf3] text-[#777587]"}`}><Icon className="size-5" /></span><span><span className="block text-sm font-semibold">{module.name}</span><span className="text-[10px] uppercase text-[#777587]">{module.availability === "AVAILABLE" ? "Live" : module.availability.replace("_", " ")}</span></span><ChevronRight className="ml-auto size-4 text-[#777587]" /></button>; })}</div><div className="mt-8 rounded-lg border border-[#d9d3ef] bg-[#f1eeff] p-4"><div className="text-xs font-semibold text-[#3525cd]">System Health</div><div className="mt-2 flex justify-between text-[11px]"><span>{modules.filter((m) => m.availability === "AVAILABLE").length} modules active</span><span className="text-green-700">API online</span></div></div></aside>
      <section className="overflow-hidden rounded-xl border border-[#ddd9e8] bg-white shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e4e1ee] p-5"><div><h2 className="font-semibold">Tenant Entitlements</h2><p className="mt-1 max-w-md text-xs text-[#777587]">Control feature access across the organization database.</p></div><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#777587]" /><Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 border-[#d7d2df] pl-9" placeholder="Filter tenants..." /></div></div><div className="overflow-x-auto"><div className="min-w-[760px]"><div className="grid border-b border-[#e4e1ee] bg-[#f7f4fb] text-[10px] font-semibold uppercase tracking-wide text-[#646273]" style={{ gridTemplateColumns: `220px repeat(${modules.length}, minmax(105px, 1fr))` }}><div className="p-4">Tenant name</div>{modules.map((module) => <div key={module.id} className={`border-l border-[#e4e1ee] p-4 text-center ${selected === module.key ? "bg-[#efebff] text-[#3525cd]" : ""}`}>{module.name}</div>)}</div>{filtered.map((tenant) => <div key={tenant.id} className="grid min-h-20 border-b border-[#eeeaf3] last:border-0" style={{ gridTemplateColumns: `220px repeat(${modules.length}, minmax(105px, 1fr))` }}><div className="flex items-center gap-3 p-4"><div className="grid size-9 place-items-center rounded-lg bg-[#ece8fa] text-xs font-bold text-[#3525cd]">{tenant.companyName.slice(0, 2).toUpperCase()}</div><div><div className="text-sm font-semibold">{tenant.companyName}</div><div className="text-[10px] text-[#777587]">{tenant.subscription?.plan.name || "No plan"}</div></div></div>{modules.map((module) => { const active = assignments[tenant.id]?.has(module.key) || false; const disabled = module.availability !== "AVAILABLE" || !permissions.includes("platform.modules.manage") || Boolean(busy); return <div key={module.id} className={`grid place-items-center border-l border-[#eeeaf3] ${selected === module.key ? "bg-[#fbfaff]" : ""}`}><button role="switch" aria-checked={active} disabled={disabled} onClick={() => toggle(tenant.id, module)} title={module.availability !== "AVAILABLE" ? "Module is not available yet" : module.dependencyKeys.length ? `Requires ${module.dependencyKeys.join(", ")}` : ""} className={`relative h-6 w-11 rounded-full transition ${active ? "bg-green-600" : "bg-[#dedbe6]"} disabled:opacity-55`}><span className={`absolute top-1 size-4 rounded-full bg-white shadow transition ${active ? "left-6" : "left-1"}`} /></button></div>; })}</div>)}</div></div><div className="border-t border-[#e4e1ee] px-5 py-4 text-xs text-[#777587]">Showing {filtered.length} of {tenants.length} tenants</div></section>
    </div>
    {createOpen && <CreateModuleDialog onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); void load(); }} />}
  </div>;
}

function CreateModuleDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [key, setKey] = useState(""); const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); try { await platformApiClient.post("/platform/modules", { key, name, description }); onCreated(); } catch { setError("Module could not be created. Check that the key is unique."); } finally { setBusy(false); } }
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4"><form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"><div className="flex justify-between"><h2 className="text-xl font-bold">Add module</h2><button type="button" onClick={onClose}><X /></button></div>{error && <p className="mt-4 text-sm text-red-700">{error}</p>}<label className="mt-5 block text-sm font-semibold">Module key<Input className="mt-2 h-11" placeholder="LEAVE" value={key} onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))} required /></label><label className="mt-4 block text-sm font-semibold">Name<Input className="mt-2 h-11" value={name} onChange={(e) => setName(e.target.value)} required /></label><label className="mt-4 block text-sm font-semibold">Description<textarea className="mt-2 min-h-24 w-full rounded-lg border border-[#c8c5d0] p-3" value={description} onChange={(e) => setDescription(e.target.value)} /></label><div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy} className="bg-[#3525cd] text-white">{busy ? "Creating..." : "Create module"}</Button></div></form></div>;
}

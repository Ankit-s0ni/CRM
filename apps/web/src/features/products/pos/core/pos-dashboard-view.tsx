"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  CalendarClock,
  GitBranch,
  Loader2,
  Monitor,
  Package,
  PackagePlus,
  Percent,
  Receipt,
  Rocket,
  ShoppingCart,
  Store,
  Users,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { getApiErrorCode } from "@/lib/api-error";
import { cn } from "@/lib/utils";

type PosSettings = {
  tenantId: string;
  invoicePrefix: string;
  taxInclusive: boolean;
  returnWindowDays: number;
  vatNumber: string | null;
  initializedAt: string | null;
};

type PosOutlet = { id: string; name: string; isActive: boolean };

export function PosDashboardView() {
  const queryClient = useQueryClient();

  const settings = useQuery({
    queryKey: ["pos", "settings"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: PosSettings }>(
        "/pos/settings",
      );
      return data.data;
    },
    retry: false,
  });

  const outlets = useQuery({
    queryKey: ["pos", "outlets"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: PosOutlet[] }>(
        "/pos/outlets",
      );
      return data.data;
    },
    enabled: settings.isSuccess,
  });

  const runSetup = useMutation({
    mutationFn: async () => {
      await apiClient.post("/pos/setup");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pos"] }),
  });

  if (settings.isPending) {
    return (
      <div className="grid gap-4">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-24 animate-pulse rounded-xl bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (settings.isError) {
    if (getApiErrorCode(settings.error) === "POS_NOT_INITIALIZED") {
      return (
        <section className="mx-auto max-w-xl py-12">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] shadow-lg shadow-blue-500/20">
              <Store className="size-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Set up Point of Sale
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              This creates your first outlet, the Oman VAT rates (5% standard,
              zero-rated, exempt, out of scope) and your invoice numbering.
            </p>
            <button
              type="button"
              onClick={() => runSetup.mutate()}
              disabled={runSetup.isPending}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] px-6 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50"
            >
              {runSetup.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Setting up…
                </>
              ) : (
                <>
                  <Rocket className="size-4" /> Run setup
                </>
              )}
            </button>
            {runSetup.isError && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Setup failed. Check that you have the pos.settings.manage permission and try again.
              </p>
            )}
          </div>
        </section>
      );
    }
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        Could not load POS settings. Please refresh the page to retry.
      </div>
    );
  }

  const quickActions = [
    { label: "Open Register", icon: Monitor, comingSoon: true },
    { label: "New Sale", icon: ShoppingCart, comingSoon: true },
    { label: "Add Product", icon: PackagePlus, comingSoon: true },
    { label: "View Reports", icon: BarChart3, comingSoon: true },
  ];

  const features = [
    { title: "Products & Catalog", desc: "Manage your product catalog, categories, and variants", icon: Package },
    { title: "Billing Register", desc: "Full-screen POS terminal for processing sales", icon: ShoppingCart },
    { title: "Inventory", desc: "Track stock levels, transfers, and adjustments", icon: Warehouse },
    { title: "Customers", desc: "Customer profiles, loyalty programs, and credit notes", icon: Users },
    { title: "Reports & Analytics", desc: "Sales reports, VAT compliance, and inventory valuation", icon: BarChart3 },
    { title: "Workflow Engine", desc: "Custom order lifecycles for any business type", icon: GitBranch },
  ];

  return (
    <div className="mx-auto max-w-[1440px]">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2563eb]">
            Workspace operations
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Point of Sale
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your sales, inventory, and customers from a single dashboard.
          </p>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quickActions.map(({ label, icon: Icon, comingSoon }) => (
          <button
            key={label}
            disabled={comingSoon}
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#2563eb]/30 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
          >
            <div className="grid size-10 place-items-center rounded-lg bg-[#2563eb]/10">
              <Icon className="size-5 text-[#2563eb]" />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-800">{label}</span>
              {comingSoon && (
                <span className="block text-[10px] font-medium text-slate-400">Coming soon</span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          icon={Receipt}
          label="Invoice Prefix"
          value={settings.data.invoicePrefix}
          accentBg="bg-blue-50"
          accentText="text-[#2563eb]"
        />
        <StatCard
          icon={Percent}
          label="Prices Include VAT"
          value={settings.data.taxInclusive ? "Yes" : "No"}
          accentBg="bg-emerald-50"
          accentText="text-emerald-600"
        />
        <StatCard
          icon={CalendarClock}
          label="Return Window"
          value={`${settings.data.returnWindowDays} days`}
          accentBg="bg-amber-50"
          accentText="text-amber-600"
        />
        <StatCard
          icon={Building2}
          label="Active Outlets"
          value={outlets.data ? String(outlets.data.length) : "…"}
          accentBg="bg-violet-50"
          accentText="text-violet-600"
        />
      </div>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/50 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Configuration</h2>
            <p className="text-xs text-slate-500">Your POS system settings at a glance</p>
          </div>
          <Link
            href="/pos/settings"
            className="text-xs font-bold text-[#2563eb] hover:underline"
          >
            Configure →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <ConfigItem label="VAT Number" value={settings.data.vatNumber ?? "Not configured"} />
          <ConfigItem
            label="Tax Mode"
            value={settings.data.taxInclusive ? "Prices include VAT" : "Prices exclude VAT"}
          />
          <ConfigItem label="Invoice Series" value={`${settings.data.invoicePrefix}-00001`} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Coming next</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title, desc, icon: Icon }) => (
            <div
              key={title}
              className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 transition hover:border-[#2563eb]/20 hover:bg-white"
            >
              <div className="mb-2 inline-flex rounded-lg bg-[#2563eb]/5 p-2">
                <Icon className="size-5 text-[#2563eb]/60" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
              <p className="mt-1 text-xs text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accentBg,
  accentText,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accentBg: string;
  accentText: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#2563eb]/30 hover:shadow-md">
      <div className={cn("mb-3 inline-flex rounded-lg p-2.5", accentBg)}>
        <Icon className={cn("size-5", accentText)} />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200/60 bg-white/60 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

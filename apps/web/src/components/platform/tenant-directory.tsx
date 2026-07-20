"use client";

import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateTenantDialog } from "@/components/platform/create-tenant-dialog";
import { platformApiClient } from "@/lib/platform-api-client";
import type { SubscriptionPlan, TenantListItem } from "@/lib/platform-types";
import { usePlatformAuthStore } from "@/lib/platform-auth-store";

type DirectoryResponse = {
  data: TenantListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function money(plan: SubscriptionPlan, seats: number) {
  const monthly =
    (Number(plan.pricePerUser) * seats) /
    (plan.billingPeriod === "YEARLY" ? 12 : 1);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: plan.currency,
    maximumFractionDigits: 0,
  }).format(monthly);
}

export function TenantDirectory() {
  const permissions = usePlatformAuthStore(
    (state) => state.user?.permissions || [],
  );
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [planId, setPlanId] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    platformApiClient
      .get<{ data: SubscriptionPlan[] }>("/platform/plans")
      .then(({ data }) => setPlans(data.data))
      .catch(() => setPlans([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await platformApiClient.get<DirectoryResponse>(
          "/platform/tenants",
          {
            params: {
              search: search || undefined,
              status: status || undefined,
              planId: planId || undefined,
              page,
              limit: 10,
            },
          },
        );
        setTenants(data.data);
        setPagination(data.pagination);
      } catch {
        setError(
          "We couldn't load tenants. Check the API connection and try again.",
        );
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [page, planId, search, status]);

  const canCreate = permissions.includes("platform.tenants.create");
  const reset = () => {
    setSearch("");
    setStatus("");
    setPlanId("");
    setPage(1);
  };

  return (
    <>
      <div className="mx-auto max-w-[1500px] p-5 lg:p-8">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Tenants</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Manage organization accounts, subscriptions and operational status
              across Oman.
            </p>
          </div>
          {canCreate && (
            <Button
              className="h-11 bg-primary px-5 text-white shadow-md hover:bg-primary/90"
              onClick={() => setCreateOpen(true)}
            >
              <Plus />
              Create Tenant
            </Button>
          )}
        </div>
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-surface-variant bg-white p-4">
          <div className="relative min-w-[240px] flex-1 sm:hidden">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline" />
            <input
              className="h-10 w-full rounded-lg border border-outline-variant pl-10 pr-3 text-sm"
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="size-4" />
            Filter by:
          </div>
          <select
            className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="CHURNED">Churned</option>
          </select>
          <select
            className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-sm"
            value={planId}
            onChange={(e) => {
              setPlanId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Plans</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
          <button
            className="ml-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-surface-variant"
            onClick={reset}
          >
            <RotateCcw className="size-4" />
            Reset Filters
          </button>
        </div>
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
          <div className="hidden grid-cols-[1.6fr_1.25fr_.85fr_1fr_.85fr_.7fr] gap-4 bg-surface-variant px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant md:grid">
            <span>Company</span>
            <span>Subdomain</span>
            <span>Plan</span>
            <span>Usage</span>
            <span>MRR</span>
            <span>Status</span>
          </div>
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-surface-variant"
                />
              ))}
            </div>
          ) : tenants.length === 0 ? (
            <div className="grid place-items-center px-6 py-20 text-center">
              <div className="grid size-14 place-items-center rounded-full bg-surface-variant text-primary">
                <Building2 />
              </div>
              <h2 className="mt-4 text-lg font-semibold">No tenants found</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Adjust your filters or create the first tenant workspace.
              </p>
            </div>
          ) : (
            tenants.map((tenant) => {
              const usage = tenant.subscription
                ? Math.min(
                    100,
                    Math.round(
                      (tenant.employees / tenant.subscription.seatCount) * 100,
                    ),
                  )
                : 0;
              return (
                <Link
                  href={`/platform/tenants/${tenant.id}`}
                  key={tenant.id}
                  className="grid gap-3 border-t border-outline-variant px-5 py-5 transition hover:bg-surface-variant first:border-t-0 md:grid-cols-[1.6fr_1.25fr_.85fr_1fr_.85fr_.7fr] md:items-center md:gap-4 md:px-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-surface-variant bg-surface text-outline">
                      <Building2 className="size-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">
                        {tenant.companyName}
                      </div>
                      <div className="text-[11px] text-outline">
                        Created{" "}
                        {new Intl.DateTimeFormat("en", {
                          month: "short",
                          day: "2-digit",
                          year: "numeric",
                        }).format(new Date(tenant.createdAt))}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    {tenant.subdomain}.hrmsapp.com
                  </div>
                  <div>
                    <span className="rounded-full bg-surface-variant px-2 py-1 text-[10px] font-semibold text-primary">
                      {tenant.subscription?.plan.name || "No plan"}
                    </span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px]">
                      <span>
                        {tenant.employees}/{tenant.subscription?.seatCount || 0}
                      </span>
                      <span>{usage}%</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-surface-container-high">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${usage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {tenant.subscription
                      ? money(
                          tenant.subscription.plan,
                          tenant.subscription.seatCount,
                        )
                      : "-"}
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${tenant.status === "ACTIVE" ? "bg-green-100 text-green-700" : tenant.status === "SUSPENDED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      {tenant.status === "TRIAL"
                        ? "Trial"
                        : tenant.status[0] +
                          tenant.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
          <div className="flex items-center justify-between border-t border-surface-variant px-5 py-4 text-xs text-on-surface-variant">
            <span>
              Showing{" "}
              {tenants.length
                ? (pagination.page - 1) * pagination.limit + 1
                : 0}{" "}
              to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} tenants
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="grid size-8 place-items-center rounded disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="grid size-8 place-items-center rounded-lg bg-primary font-bold text-white">
                {page}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="grid size-8 place-items-center rounded disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3 md:hidden">
          <div className="rounded-xl border bg-white p-4">
            <Users className="size-5 text-primary" />
            <div className="mt-2 text-2xl font-semibold">
              {pagination.total}
            </div>
            <div className="text-xs text-outline">Tenant accounts</div>
          </div>
        </div>
      </div>
      {createOpen && (
        <CreateTenantDialog
          plans={plans}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </>
  );
}

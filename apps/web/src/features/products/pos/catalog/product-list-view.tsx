"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Upload, Download, Filter, ChevronLeft, ChevronRight, PackageOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import {
  AdminPage,
  ErrorState,
  LoadingState,
  Panel,
  PrimaryButton,
  inputClass,
} from "@/shared/components/page-primitives";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryId?: string;
  category?: { name: string };
  costPrice: string;
  sellingPrice: string;
  isActive: boolean;
};

type Category = {
  id: string;
  name: string;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function ProductListView() {
  const router = useRouter();
  const { user } = useAuthStore();
  const canManage = user?.permissions?.includes("pos.product.create") ?? true; // assume pos.product.create implies manage basically

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [categoryId, setCategoryId] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;


  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data, isLoading, error } = useQuery({
    queryKey: ["pos", "products", debouncedSearch, categoryId, includeInactive, page],
    queryFn: () => apiClient.get<{ data: Product[]; meta: { page: number; pageSize: number; total: number } }>("/pos/products", {
      params: {
        q: debouncedSearch || undefined,
        categoryId: categoryId || undefined,
        includeInactive,
        page,
        pageSize,
      },
    }).then((res) => res.data),
  });

  const { data: categories } = useQuery({
    queryKey: ["pos", "categories"],
    queryFn: () => apiClient.get<{ data: Category[] }>("/pos/categories").then((res) => res.data.data),
  });

  const handleExport = async () => {
    try {
      const res = await apiClient.get("/pos/products/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `products_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      alert("Failed to export products. You may lack the pos.product.read permission.");
    }
  };

  if (isLoading && !data) return <AdminPage title="Products" description="Manage your product catalog"><LoadingState /></AdminPage>;
  if (error) return <AdminPage title="Products" description="Manage your product catalog"><ErrorState message="Failed to load products." /></AdminPage>;

  const products = data?.data || [];
  const meta = data?.meta || { page: 1, pageSize, total: 0 };
  const totalPages = Math.ceil(meta.total / meta.pageSize);

  if (products.length === 0 && !debouncedSearch && !categoryId && !includeInactive) {
    return (
      <AdminPage title="Products" description="Manage your product catalog">
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-blue-100 text-blue-600 shadow-sm mb-4">
            <PackageOpen className="size-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Your catalog is empty</h2>
          <p className="mt-2 max-w-md text-slate-500">
            Start building your catalog by adding products manually or importing them from a spreadsheet.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Link href="/pos/products/import" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
              <Upload className="size-4" /> Import CSV
            </Link>
            <Link href="/pos/products/new">
              <PrimaryButton>
                <Plus className="mr-2 size-4" /> New Product
              </PrimaryButton>
            </Link>
          </div>
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title="Products"
      description="Manage your product catalog, pricing, and inventory."
      action={
        canManage && (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExport}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Download className="size-4" /> Export
            </button>
            <Link href="/pos/products/import" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
              <Upload className="size-4" /> Import
            </Link>
            <Link href="/pos/products/new">
              <PrimaryButton className="h-9 px-4">
                <Plus className="mr-2 size-4" /> New
              </PrimaryButton>
            </Link>
          </div>
        )
      }
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, SKU or barcode..."
              className={cn(inputClass, "pl-9")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <select
              className={cn(inputClass, "pl-9 min-w-[160px]")}
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              checked={includeInactive}
              onChange={(e) => { setIncludeInactive(e.target.checked); setPage(1); }}
            />
            Include Inactive
          </label>
        </div>
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU / Barcode</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Cost Price</th>
                <th className="px-4 py-3 font-medium text-right">Selling Price</th>
                <th className="px-4 py-3 font-medium w-[80px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr 
                  key={product.id} 
                  className={cn(
                    "transition-colors hover:bg-slate-50 cursor-pointer",
                    !product.isActive && "opacity-60"
                  )}
                  onClick={() => router.push(`/pos/products/${product.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-slate-700">{product.sku}</span>
                      {product.barcode && <span className="text-xs text-slate-400">{product.barcode}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{product.category?.name || "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-600 font-mono">{product.costPrice}</td>
                  <td className="px-4 py-3 text-right text-slate-900 font-mono font-medium">{product.sellingPrice}</td>
                  <td className="px-4 py-3">
                    {product.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No products found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {meta.total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
            <p className="text-sm text-slate-700">
              Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{" "}
              <span className="font-medium">{Math.min(page * pageSize, meta.total)}</span> of{" "}
              <span className="font-medium">{meta.total}</span> results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="grid size-8 place-items-center rounded-md border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="grid size-8 place-items-center rounded-md border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </Panel>
    </AdminPage>
  );
}

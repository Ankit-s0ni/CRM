"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Trash2, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api-error";
import {
  AdminPage,
  Field,
  LoadingState,
  PrimaryButton,
  inputClass,
} from "@/shared/components/page-primitives";
import { cn } from "@/lib/utils";
import { ProductImageUploader } from "./product-image-uploader";
import { VariantMatrixEditor } from "./variant-matrix-editor";
import { BundleEditor } from "./bundle-editor";

type Category = { id: string; name: string };
type Unit = { id: string; code: string; name: string };

type ProductState = {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  brand: string;
  categoryId: string;
  unitOfMeasureId: string;
  costPrice: string;
  sellingPrice: string;
  mrp: string;
  wholesalePrice: string;
  trackInventory: boolean;
  allowNegativeStock: boolean;
  sellByWeight: boolean;
  reorderPoint: string;
  reorderQuantity: string;
  isActive: boolean;
};

const defaultState: ProductState = {
  name: "", sku: "", barcode: "", description: "", brand: "",
  categoryId: "", unitOfMeasureId: "",
  costPrice: "", sellingPrice: "", mrp: "", wholesalePrice: "",
  trackInventory: true, allowNegativeStock: false, sellByWeight: false,
  reorderPoint: "", reorderQuantity: "", isActive: true
};

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden mb-6 shadow-sm">
      <button 
        type="button" 
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors"
      >
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {open ? <ChevronUp className="size-5 text-slate-400" /> : <ChevronDown className="size-5 text-slate-400" />}
      </button>
      {open && <div className="p-6 space-y-6">{children}</div>}
    </div>
  );
}

export function ProductFormView({ productId }: { productId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = !!productId;

  const [form, setForm] = useState<ProductState>(defaultState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Fetch product if editing
  const { data: productData, isLoading: isLoadingProduct, refetch } = useQuery({
    queryKey: ["pos", "products", productId],
    queryFn: () => apiClient.get<{ data: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ }>(`/pos/products/${productId}`).then(res => res.data.data),
    enabled: isEditing,
  });

  // Fetch categories & units
  const { data: categories } = useQuery({
    queryKey: ["pos", "categories"],
    queryFn: () => apiClient.get<{ data: Category[] }>("/pos/categories").then(res => res.data.data),
  });
  const { data: units } = useQuery({
    queryKey: ["pos", "units"],
    queryFn: () => apiClient.get<{ data: Unit[] }>("/pos/units").then(res => res.data.data),
  });

  useEffect(() => {
    if (productData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        name: productData.name || "",
        sku: productData.sku || "",
        barcode: productData.barcode || "",
        description: productData.description || "",
        brand: productData.brand || "",
        categoryId: productData.categoryId || "",
        unitOfMeasureId: productData.unitOfMeasureId || "",
        costPrice: productData.costPrice || "",
        sellingPrice: productData.sellingPrice || "",
        mrp: productData.mrp || "",
        wholesalePrice: productData.wholesalePrice || "",
        trackInventory: productData.trackInventory ?? true,
        allowNegativeStock: productData.allowNegativeStock ?? false,
        sellByWeight: productData.sellByWeight ?? false,
        reorderPoint: productData.reorderPoint?.toString() || "",
        reorderQuantity: productData.reorderQuantity?.toString() || "",
        isActive: productData.isActive ?? true,
      });
    }
  }, [productData]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.sku.trim()) newErrors.sku = "SKU is required";
    if (!form.costPrice.trim()) newErrors.costPrice = "Cost price is required";
    if (!form.sellingPrice.trim()) newErrors.sellingPrice = "Selling price is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (isEditing) {
        return apiClient.patch(`/pos/products/${productId}`, payload);
      }
      return apiClient.post("/pos/products", payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["pos", "products"] });
      if (!isEditing) {
        router.push(`/pos/products/${res.data.data.id}`);
      } else {
        setGlobalError(null);
        setErrors({});
      }
    },
    onError: (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
      const code = getApiErrorCode(err);
      if (code === "POS_PRODUCT_DUPLICATE") {
        const errData = err.response?.data?.details;
        const newErrors: Record<string, string> = {};
        if (Array.isArray(errData)) {
          errData.forEach((d: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
            if (d.field) newErrors[d.field] = d.messages?.[0] || "Duplicate value";
          });
        }
        setErrors(newErrors);
        setGlobalError("A product with this SKU or Barcode already exists.");
      } else {
        setGlobalError(getApiErrorMessage(err, "Failed to save product"));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/pos/products/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", "products"] });
      router.push("/pos/products");
    },
    onError: (err) => {
      setGlobalError(getApiErrorMessage(err, "Failed to deactivate product"));
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      costPrice: form.costPrice,
      sellingPrice: form.sellingPrice,
      trackInventory: form.trackInventory,
      allowNegativeStock: form.allowNegativeStock,
      sellByWeight: form.sellByWeight,
    };

    if (form.barcode.trim()) payload.barcode = form.barcode.trim();
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.brand.trim()) payload.brand = form.brand.trim();
    if (form.categoryId) payload.categoryId = form.categoryId;
    if (form.unitOfMeasureId) payload.unitOfMeasureId = form.unitOfMeasureId;
    
    if (form.mrp.trim()) payload.mrp = form.mrp;
    if (form.wholesalePrice.trim()) payload.wholesalePrice = form.wholesalePrice;
    
    if (form.reorderPoint) payload.reorderPoint = parseInt(form.reorderPoint, 10);
    if (form.reorderQuantity) payload.reorderQuantity = parseInt(form.reorderQuantity, 10);

    if (isEditing) {
      payload.isActive = form.isActive;
    }

    saveMutation.mutate(payload);
  };

  const handleDeactivate = () => {
    if (confirm("Are you sure you want to deactivate this product?")) {
      deleteMutation.mutate();
    }
  };

  if (isEditing && isLoadingProduct) return <AdminPage title="Edit Product" description=""><LoadingState /></AdminPage>;

  return (
    <AdminPage
      title={isEditing ? "Edit Product" : "New Product"}
      description="Manage product details, pricing, and configuration."
      action={
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link href="/pos/products" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
            <ArrowLeft className="size-4" /> Back
          </Link>
          <PrimaryButton onClick={handleSubmit} disabled={saveMutation.isPending} className="h-9 px-4">
            {saveMutation.isPending ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Save Product
          </PrimaryButton>
        </div>
      }
    >
      <div className="max-w-4xl pb-10">
        {globalError && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle className="size-5 shrink-0" />
            <p className="text-sm font-medium">{globalError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isEditing && (
            <Section title="Status">
              <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="size-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-semibold text-slate-900">Active Status</div>
                  <div className="text-sm text-slate-500">Uncheck to soft-delete or hide this product from POS and Catalog.</div>
                </div>
              </label>
            </Section>
          )}

          <Section title="Basic Information">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Product Name" helpKey={undefined}>
                <input
                  className={cn(inputClass, errors.name && "border-red-500")}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Classic T-Shirt"
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </Field>
              <Field label="Brand" helpKey={undefined}>
                <input
                  className={inputClass}
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="e.g. Nike"
                />
              </Field>
              <Field label="SKU" helpKey={undefined}>
                <input
                  className={cn(inputClass, errors.sku && "border-red-500")}
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="e.g. TSHIRT-BLK-M"
                />
                {errors.sku && <p className="mt-1 text-xs text-red-500">{errors.sku}</p>}
              </Field>
              <Field label="Barcode (UPC/EAN)" helpKey={undefined}>
                <input
                  className={cn(inputClass, errors.barcode && "border-red-500")}
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder="e.g. 0123456789012"
                />
                {errors.barcode && <p className="mt-1 text-xs text-red-500">{errors.barcode}</p>}
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description" helpKey={undefined}>
                  <textarea
                    className={cn(inputClass, "min-h-[100px] resize-y")}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Provide a detailed description..."
                  />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Pricing">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Cost Price (OMR)" helpKey={undefined}>
                <input
                  className={cn(inputClass, errors.costPrice && "border-red-500", "font-mono")}
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                  placeholder="0.000"
                />
                {errors.costPrice && <p className="mt-1 text-xs text-red-500">{errors.costPrice}</p>}
              </Field>
              <Field label="Selling Price (OMR)" helpKey={undefined}>
                <input
                  className={cn(inputClass, errors.sellingPrice && "border-red-500", "font-mono font-medium")}
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  placeholder="0.000"
                />
                {errors.sellingPrice && <p className="mt-1 text-xs text-red-500">{errors.sellingPrice}</p>}
              </Field>
              <Field label="MRP (Optional)" helpKey={undefined}>
                <input
                  className={cn(inputClass, "font-mono")}
                  value={form.mrp}
                  onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                  placeholder="0.000"
                />
              </Field>
              <Field label="Wholesale Price (Optional)" helpKey={undefined}>
                <input
                  className={cn(inputClass, "font-mono")}
                  value={form.wholesalePrice}
                  onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value })}
                  placeholder="0.000"
                />
              </Field>
            </div>
          </Section>

          <Section title="Categorization & Units">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Category" helpKey={undefined}>
                <select
                  className={inputClass}
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">Select a category</option>
                  {categories?.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Unit of Measure" helpKey={undefined}>
                <select
                  className={inputClass}
                  value={form.unitOfMeasureId}
                  onChange={(e) => setForm({ ...form, unitOfMeasureId: e.target.value })}
                >
                  <option value="">Select a unit</option>
                  {units?.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center gap-3 sm:col-span-2 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={form.sellByWeight}
                  onChange={(e) => setForm({ ...form, sellByWeight: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">This product is sold by weight / volume (requires weighing scale integration)</span>
              </label>
            </div>
          </Section>

          <Section title="Inventory Configuration">
            <div className="space-y-6">
              <div className="flex flex-col gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.trackInventory}
                    onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Track Inventory (Stock level will be deducted upon sale)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allowNegativeStock}
                    onChange={(e) => setForm({ ...form, allowNegativeStock: e.target.checked })}
                    disabled={!form.trackInventory}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className={cn("text-sm font-medium", !form.trackInventory ? "text-slate-400" : "text-slate-700")}>
                    Allow Negative Stock (Can sell even if stock reaches 0)
                  </span>
                </label>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 pt-4 border-t border-slate-100">
                <Field label="Reorder Point" helpKey={undefined}>
                  <input
                    type="number"
                    className={inputClass}
                    value={form.reorderPoint}
                    onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })}
                    disabled={!form.trackInventory}
                    placeholder="e.g. 10"
                  />
                </Field>
                <Field label="Reorder Quantity" helpKey={undefined}>
                  <input
                    type="number"
                    className={inputClass}
                    value={form.reorderQuantity}
                    onChange={(e) => setForm({ ...form, reorderQuantity: e.target.value })}
                    disabled={!form.trackInventory}
                    placeholder="e.g. 50"
                  />
                </Field>
              </div>
            </div>
          </Section>

          {isEditing && (
            <>
              <Section title="Images" defaultOpen={false}>
                <ProductImageUploader 
                  productId={productId} 
                  imageUrls={productData?.imageUrls} 
                  onImagesUpdated={() => refetch()} 
                />
              </Section>
              
              <Section title="Variants Matrix" defaultOpen={false}>
                <VariantMatrixEditor productId={productId} />
              </Section>
              
              <Section title="Bundle Configuration" defaultOpen={false}>
                <BundleEditor productId={productId} />
              </Section>
            </>
          )}

          {isEditing && (
            <div className="mt-10 flex items-center justify-between border-t border-red-200 bg-red-50 p-6 rounded-xl">
              <div>
                <h3 className="font-semibold text-red-900">Danger Zone</h3>
                <p className="text-sm text-red-700 mt-1">Deactivating this product will remove it from the active catalog.</p>
              </div>
              <button
                type="button"
                onClick={handleDeactivate}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
              >
                <Trash2 className="size-4" /> Deactivate Product
              </button>
            </div>
          )}
        </form>
      </div>
    </AdminPage>
  );
}

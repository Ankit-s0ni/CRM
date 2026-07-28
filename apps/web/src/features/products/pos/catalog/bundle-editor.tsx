"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, Save, AlertCircle, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-error";
import { PrimaryButton, inputClass } from "@/shared/components/page-primitives";

export function BundleEditor({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const [bundlePrice, setBundlePrice] = useState("");
  const [components, setComponents] = useState<{ productId: string; variantId?: string; quantity: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: product } = useQuery({
    queryKey: ["pos", "products", productId],
    queryFn: () => apiClient.get<{ data: { bundle?: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ } }>(`/pos/products/${productId}`).then(res => res.data.data),
  });

  const { data: allProducts } = useQuery({
    queryKey: ["pos", "products", "list_all"],
    queryFn: () => apiClient.get<{ data: { id: string, name: string, sku: string }[] }>("/pos/products?pageSize=500&includeInactive=false").then(res => res.data.data),
  });

  // Load existing bundle
  useEffect(() => {
    if (product?.bundle) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBundlePrice(product.bundle.bundlePrice || "");
      setComponents(product.bundle.components?.map((c: { productId: string; variantId?: string; quantity: number }) => ({
        productId: c.productId,
        variantId: c.variantId,
        quantity: c.quantity.toString()
      })) || []);
    }
  }, [product]);

  const saveMutation = useMutation({
    mutationFn: (payload: { bundlePrice: string, components: any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */ }) => apiClient.put(`/pos/products/${productId}/bundle`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", "products", productId] });
      setError(null);
      alert("Bundle saved successfully.");
    },
    onError: (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
      setError(err.response?.data?.message || getApiErrorMessage(err, "Failed to save bundle."));
    }
  });

  const handleSave = () => {
    const validComponents = components.filter(c => c.productId && c.quantity);
    if (validComponents.length === 0) {
      setError("Please add at least one component product.");
      return;
    }
    
    // Parse quantity to numbers, default 1
    const payload = {
      bundlePrice: bundlePrice || "0",
      components: validComponents.map(c => ({
        productId: c.productId,
        variantId: c.variantId || undefined,
        quantity: parseInt(c.quantity, 10) || 1
      }))
    };
    
    saveMutation.mutate(payload);
  };

  const addComponent = () => {
    setComponents([...components, { productId: "", quantity: "1" }]);
  };

  const removeComponent = (index: number) => {
    const newComps = [...components];
    newComps.splice(index, 1);
    setComponents(newComps);
  };

  const updateComponent = (index: number, field: "productId" | "quantity", value: string) => {
    const newComps = [...components];
    newComps[index][field] = value;
    setComponents(newComps);
  };

  // Filter out the current product from available products to prevent self-reference
  const availableProducts = allProducts?.filter(p => p.id !== productId) || [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h4 className="font-semibold text-slate-800 mb-4">Bundle Configuration</h4>
        <p className="text-sm text-slate-500 mb-6 max-w-2xl">
          A bundle is composed of multiple products sold together. You can set a specific bundle price that overrides the individual component prices.
        </p>

        <div className="mb-6 max-w-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1">Bundle Price (OMR)</label>
          <input
            className={inputClass}
            placeholder="e.g. 5.000"
            value={bundlePrice}
            onChange={(e) => setBundlePrice(e.target.value)}
          />
        </div>

        <div className="space-y-3 mb-6">
          <label className="block text-sm font-medium text-slate-700">Components</label>
          {components.map((comp, i) => (
            <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <div className="grid size-10 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-400">
                <Package className="size-5" />
              </div>
              <div className="flex-1">
                <select
                  className={inputClass}
                  value={comp.productId}
                  onChange={(e) => updateComponent(i, "productId", e.target.value)}
                >
                  <option value="">Select a product...</option>
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>
              <div className="w-[120px] shrink-0">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">Qty</span>
                  <input
                    type="number"
                    min="1"
                    className={`${inputClass} pl-9`}
                    value={comp.quantity}
                    onChange={(e) => updateComponent(i, "quantity", e.target.value)}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeComponent(i)}
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addComponent}
            className="inline-flex h-10 items-center justify-center w-full rounded-lg border border-dashed border-slate-300 bg-white text-sm font-medium text-blue-600 hover:bg-slate-50 transition"
          >
            <Plus className="mr-2 size-4" /> Add Component Product
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100">
            <AlertCircle className="size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <PrimaryButton type="button" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          Save Bundle
        </PrimaryButton>
      </div>
    </div>
  );
}

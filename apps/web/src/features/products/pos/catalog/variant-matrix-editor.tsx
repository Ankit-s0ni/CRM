"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, CheckCircle2, Loader2, Play, AlertCircle } from "lucide-react";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-error";
import { PrimaryButton, inputClass } from "@/shared/components/page-primitives";

export function VariantMatrixEditor({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const [attributes, setAttributes] = useState<{ name: string; values: string }[]>([
    { name: "Size", values: "S, M, L" }
  ]);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: product } = useQuery({
    queryKey: ["pos", "products", productId],
    queryFn: () => apiClient.get<{ data: { variants?: any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */ } }>(`/pos/products/${productId}`).then(res => res.data.data),
  });

  const variants = product?.variants || [];

  const generateMutation = useMutation({
    mutationFn: (payload: { attributes: { name: string; values: string[] }[] }) => 
      apiClient.post<{ data: any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */; meta: { created: number; skipped: number } }>(`/pos/products/${productId}/variants/generate`, payload),
    onSuccess: (res) => {
      setResult(res.data.meta);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["pos", "products", productId] });
    },
    onError: (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
      setError(err.response?.data?.message || getApiErrorMessage(err, "Failed to generate variants."));
      setResult(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (variantId: string) => apiClient.delete(`/pos/products/${productId}/variants/${variantId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", "products", productId] });
    },
    onError: (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
      alert(getApiErrorMessage(err, "Failed to remove variant."));
    }
  });

  const handleGenerate = () => {
    if (attributes.length === 0) return;
    
    // Parse values by comma and trim
    const parsedAttributes = attributes
      .filter(a => a.name.trim() && a.values.trim())
      .map(a => ({
        name: a.name.trim(),
        values: a.values.split(",").map(v => v.trim()).filter(Boolean)
      }));

    if (parsedAttributes.length === 0) {
      setError("Please add at least one attribute with values.");
      return;
    }

    generateMutation.mutate({ attributes: parsedAttributes });
  };

  const addAttribute = () => {
    setAttributes([...attributes, { name: "", values: "" }]);
  };

  const removeAttribute = (index: number) => {
    const newAttrs = [...attributes];
    newAttrs.splice(index, 1);
    setAttributes(newAttrs);
  };

  const updateAttribute = (index: number, field: "name" | "values", value: string) => {
    const newAttrs = [...attributes];
    newAttrs[index][field] = value;
    setAttributes(newAttrs);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h4 className="font-semibold text-slate-800 mb-4">Generate Variants</h4>
        <p className="text-sm text-slate-500 mb-6">
          Define attributes like Size or Color to automatically generate variant combinations. 
          Generating is additive — it will only create combinations that do not already exist.
        </p>

        <div className="space-y-3 mb-6">
          {attributes.map((attr, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex-1">
                <input
                  className={inputClass}
                  placeholder="e.g. Size"
                  value={attr.name}
                  onChange={(e) => updateAttribute(i, "name", e.target.value)}
                />
              </div>
              <div className="flex-[2]">
                <input
                  className={inputClass}
                  placeholder="e.g. S, M, L"
                  value={attr.values}
                  onChange={(e) => updateAttribute(i, "values", e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => removeAttribute(i)}
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addAttribute}
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <Plus className="mr-1 size-4" /> Add Attribute
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100">
            <AlertCircle className="size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="size-4 shrink-0" />
            <p><strong>Success!</strong> {result.created} variants created, {result.skipped} skipped (already existed).</p>
          </div>
        )}

        <PrimaryButton type="button" onClick={handleGenerate} disabled={generateMutation.isPending}>
          {generateMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Play className="mr-2 size-4" />}
          Generate Variants
        </PrimaryButton>
      </div>

      {variants.length > 0 && (
        <div>
          <h4 className="font-semibold text-slate-800 mb-3">Existing Variants ({variants.length})</h4>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium text-right w-[80px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {variants.map((v: { id: string, name: string, sku: string }) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{v.name}</td>
                    <td className="px-4 py-3 text-slate-500">{v.sku}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove variant ${v.name}?`)) {
                            deleteMutation.mutate(v.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="grid size-8 place-items-center ml-auto rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

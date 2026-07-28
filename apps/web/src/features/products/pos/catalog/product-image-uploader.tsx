"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";

export function ProductImageUploader({ productId, imageUrls = [], onImagesUpdated }: { productId: string, imageUrls?: string[], onImagesUpdated: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // We need the raw product data to get the current imageKeys
  const { data: product } = useQuery({
    queryKey: ["pos", "products", productId],
    queryFn: () => apiClient.get<{ data: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ }>(`/pos/products/${productId}`).then(res => res.data.data),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPG, PNG and WebP images are supported.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    const currentKeys = product?.imageKeys || [];
    if (currentKeys.length >= 5) {
      setError("Maximum 5 images allowed per product.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1. Presign
      const presignRes = await apiClient.post<{ objectKey: string; uploadUrl: string }>(`/pos/products/${productId}/images/presign`, {
        filename: file.name,
        contentType: file.type,
        fileSize: file.size
      });
      const { objectKey, uploadUrl } = presignRes.data;

      // 2. Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type }
      });
      
      if (!uploadRes.ok) throw new Error("Failed to upload image.");

      // 3. Update Product
      await apiClient.patch(`/pos/products/${productId}`, {
        imageKeys: [...currentKeys, objectKey]
      });

      onImagesUpdated();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError("An error occurred while uploading the image.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (index: number) => {
    if (!confirm("Are you sure you want to remove this image?")) return;
    
    const currentKeys = product?.imageKeys || [];
    const newKeys = [...currentKeys];
    newKeys.splice(index, 1);
    
    try {
      await apiClient.patch(`/pos/products/${productId}`, {
        imageKeys: newKeys
      });
      onImagesUpdated();
    } catch {
      alert("Failed to remove image.");
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {imageUrls.map((url, i) => (
          <div key={i} className="group relative aspect-square rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Product image ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        
        {imageUrls.length < 5 && (
          <div 
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition"
          >
            {uploading ? (
              <Loader2 className="size-6 text-slate-400 animate-spin" />
            ) : (
              <>
                <Upload className="size-6 text-slate-400 mb-2" />
                <span className="text-xs font-medium text-slate-500">Upload Image</span>
              </>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500">Upload up to 5 images (JPG, PNG, WebP). Max 5MB each.</p>
    </div>
  );
}

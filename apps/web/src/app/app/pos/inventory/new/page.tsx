"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

type Category = {
  id: string;
  name: string;
};

export default function NewInventoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    apiClient.get('/pos/categories')
      .then((res) => {
        setCategories(res.data?.data || res.data || []);
      })
      .catch(console.error);
  }, []);
  
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      barcode: (formData.get('barcode') as string) || undefined,
      categoryId: (formData.get('categoryId') as string) || undefined,
      sellingPrice: Number(formData.get('sellingPrice')),
      costPrice: Number(formData.get('costPrice')),
      taxPercentage: Number(formData.get('taxPercentage')),
      stockQuantity: Number(formData.get('stockQuantity')),
      unit: (formData.get('unit') as string) || 'pcs',
      imageUrl: (formData.get('imageUrl') as string) || undefined,
      isActive: formData.get('isActive') === 'on',
    };
    
    try {
      await apiClient.post('/pos/inventory', data);
      router.push('/app/pos/inventory');
      router.refresh();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to create product';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/app/pos/inventory" className="text-gray-500 hover:text-gray-700 transition-colors">
          &larr; Back
        </Link>
        <h1 className="text-2xl font-bold">New Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border shadow-sm">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input type="text" name="name" required className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select name="categoryId" className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
            <input type="text" name="sku" required className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
            <input type="text" name="barcode" className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price *</label>
            <input type="number" step="0.01" min="0" name="sellingPrice" required className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price *</label>
            <input type="number" step="0.01" min="0" name="costPrice" required className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax (%)</label>
            <input type="number" step="0.01" min="0" defaultValue="0" name="taxPercentage" className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock</label>
            <input type="number" min="0" defaultValue="0" name="stockQuantity" className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <input type="text" name="unit" defaultValue="pcs" placeholder="e.g. pcs, kg, box" className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
          <input type="url" name="imageUrl" placeholder="https://example.com/image.jpg" className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" name="isActive" id="isActive" className="h-4 w-4 text-blue-600" defaultChecked />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
        </div>

        <div className="pt-4">
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors font-medium disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  );
}

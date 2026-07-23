"use client";

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category?: { name: string };
  sellingPrice: number;
  stockQuantity: number;
  isActive: boolean;
};

type Meta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function PosInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = useCallback(async (page = 1, searchQuery = search) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/pos/inventory', {
        params: { page, limit: 10, search: searchQuery || undefined },
      });
      setProducts(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(1, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchProducts]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <Link 
          href="/app/pos/inventory/new" 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Add Product
        </Link>
      </div>
      
      <div className="mb-4">
        <input 
          type="text" 
          placeholder="Search by name, SKU, or barcode..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU / Barcode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    Loading inventory...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div>{p.sku}</div>
                      {p.barcode && <div className="text-xs text-gray-400">{p.barcode}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{p.category?.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                      ${Number(p.sellingPrice).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span className={`font-medium ${p.stockQuantity <= 5 ? 'text-red-600' : 'text-gray-900'}`}>
                        {p.stockQuantity}
                      </span>
                      {p.stockQuantity <= 5 && <div className="text-[10px] text-red-500 uppercase">Low Stock</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && meta.totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium">{(meta.page - 1) * meta.limit + 1}</span> to <span className="font-medium">{Math.min(meta.page * meta.limit, meta.total)}</span> of <span className="font-medium">{meta.total}</span> results
            </div>
            <div className="flex gap-2">
              <button 
                disabled={meta.page === 1}
                onClick={() => fetchProducts(meta.page - 1)}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-100 transition-colors bg-white"
              >
                Previous
              </button>
              <button 
                disabled={meta.page === meta.totalPages}
                onClick={() => fetchProducts(meta.page + 1)}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-100 transition-colors bg-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

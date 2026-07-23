"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

type Category = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
};

export default function PosCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<{ data: Category[] }>('/pos/categories')
      .then((res) => {
        setCategories(res.data.data || res.data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Product Categories</h1>
        <Link 
          href="/app/pos/categories/new" 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Create Category
        </Link>
      </div>
      
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td className="px-6 py-8 text-center text-sm text-gray-500" colSpan={3}>
                  Loading categories...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-center text-sm text-gray-500" colSpan={3}>
                  No categories found. Click "Create Category" to get started.
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{cat.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{cat.description || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

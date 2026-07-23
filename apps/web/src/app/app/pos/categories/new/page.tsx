"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function NewCategoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || undefined,
      parentId: (formData.get('parentId') as string) || undefined,
      isActive: formData.get('isActive') === 'on',
    };
    
    try {
      await apiClient.post('/pos/categories', data);
      router.push('/app/pos/categories');
      router.refresh();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to create category';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/app/pos/categories" className="text-gray-500 hover:text-gray-700 transition-colors">
          &larr; Back
        </Link>
        <h1 className="text-2xl font-bold">New Category</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border shadow-sm">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input 
            type="text" 
            name="name"
            required
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="Category name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea 
            name="description"
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="Optional description"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category ID</label>
          <input 
            type="text" 
            name="parentId"
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="Leave empty for root category"
          />
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" name="isActive" id="isActive" className="h-4 w-4 text-blue-600" defaultChecked />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Category'}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Store, TrendingUp, ShoppingBag, Receipt, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";

type DashboardData = {
  metrics: {
    revenue: number;
    transactions: number;
    averageOrderValue: number;
    totalItemsSold: number;
    lowStockCount: number;
    activeProductsCount: number;
  };
  lowStockAlerts: Array<{ id: string; name: string; sku: string; stockQuantity: number }>;
  recentSales: Array<{
    id: string;
    orderNumber: number;
    total: number;
    status: string;
    createdAt: string;
    items: Array<{ quantity: number; product: { name: string } }>;
  }>;
};

export default function PosDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/pos/dashboard/metrics')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading dashboard...</div>;
  }

  const m = data?.metrics;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-xl bg-blue-100 text-blue-600">
            <Store className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Point of Sale</h1>
            <p className="text-sm text-gray-500">Store overview and performance metrics</p>
          </div>
        </div>
        <Link href="/app/pos/checkout" className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">
          New Sale
        </Link>
      </div>
      
      {/* Metric Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Total Revenue</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">${m?.revenue.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-green-50 rounded-full text-green-600"><TrendingUp size={24} /></div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Transactions</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{m?.transactions}</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-full text-blue-600"><Receipt size={24} /></div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Avg Order Value</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">${m?.averageOrderValue.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-full text-purple-600"><ShoppingBag size={24} /></div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Items Sold</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{m?.totalItemsSold}</div>
          </div>
          <div className="p-3 bg-orange-50 rounded-full text-orange-600"><Store size={24} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800">Recent Sales</h2>
            <Link href="/app/pos/order" className="text-blue-600 text-sm font-medium hover:underline">View All</Link>
          </div>
          {data?.recentSales.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No recent sales found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase bg-white">
                  <th className="p-4 font-semibold">Order #</th>
                  <th className="p-4 font-semibold">Items</th>
                  <th className="p-4 font-semibold">Total</th>
                  <th className="p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.recentSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">#{sale.orderNumber}</td>
                    <td className="p-4 text-gray-600 text-sm">
                      {sale.items.reduce((acc, item) => acc + item.quantity, 0)} items
                    </td>
                    <td className="p-4 font-bold text-gray-900">${Number(sale.total).toFixed(2)}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        {sale.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-red-50 flex justify-between items-center">
            <h2 className="font-bold text-red-800 flex items-center gap-2">
              <AlertCircle size={18} />
              Low Stock Alerts
            </h2>
            <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">{m?.lowStockCount} items</span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {data?.lowStockAlerts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Inventory is healthy! No low stock items.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {data?.lowStockAlerts.map(item => (
                  <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-red-600">{item.stockQuantity}</div>
                      <div className="text-[10px] uppercase font-bold text-gray-400">Left</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {data && data.lowStockAlerts.length > 0 && (
            <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
              <Link href="/app/pos/inventory" className="text-sm font-medium text-blue-600 hover:underline">Manage Inventory</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

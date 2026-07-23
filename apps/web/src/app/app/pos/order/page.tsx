"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

type Order = {
  id: string;
  orderNumber: number;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
};

export default function PosOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/pos/orders')
      .then(res => setOrders(res.data?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Orders & Invoices</h1>
        <Link href="/app/pos/checkout" className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">
          New Sale
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No orders found.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 uppercase">
                <th className="p-4 font-semibold">Order #</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Total</th>
                <th className="p-4 font-semibold">Payment</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">#{order.orderNumber}</td>
                  <td className="p-4 text-gray-600">{new Date(order.createdAt).toLocaleString()}</td>
                  <td className="p-4 font-bold text-gray-900">${Number(order.total).toFixed(2)}</td>
                  <td className="p-4 text-gray-600">{order.paymentMethod}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link 
                      href={`/app/pos/order/${order.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Invoice
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

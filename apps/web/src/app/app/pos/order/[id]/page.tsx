"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: { name: string; sku: string };
};

type Order = {
  id: string;
  orderNumber: number;
  subtotal: number;
  taxTotal: number;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
};

export default function InvoicePreviewPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      apiClient.get(`/pos/orders/${params.id}`)
        .then(res => setOrder(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) return <div className="p-12 text-center text-gray-500">Loading invoice...</div>;
  if (!order) return <div className="p-12 text-center text-red-500">Invoice not found.</div>;

  const handleDownloadPdf = async () => {
    try {
      const response = await apiClient.get(`/pos/orders/${order.id}/invoice/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${order.orderNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error('Failed to download PDF', err);
      alert('Failed to generate PDF. Check console.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Link href="/app/pos/order" className="text-gray-500 hover:text-gray-800">
          &larr; Back to Orders
        </Link>
        <button 
          onClick={handleDownloadPdf}
          className="bg-blue-600 text-white px-5 py-2 rounded font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Download PDF
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-10">
        <div className="flex justify-between items-start border-b border-gray-200 pb-8 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">INVOICE</h1>
            <div className="mt-4 text-gray-600 space-y-1">
              <p><span className="font-semibold text-gray-800">Invoice #:</span> {order.orderNumber}</p>
              <p><span className="font-semibold text-gray-800">Date:</span> {new Date(order.createdAt).toLocaleString()}</p>
              <p><span className="font-semibold text-gray-800">Payment Method:</span> {order.paymentMethod}</p>
              <p>
                <span className="font-semibold text-gray-800">Status:</span> 
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 uppercase tracking-wide">
                  {order.status}
                </span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-800 mb-1">Company Name</h2>
            <p className="text-gray-500 text-sm">Walk-in Customer</p>
          </div>
        </div>

        <table className="w-full text-left mb-8">
          <thead>
            <tr className="border-b-2 border-gray-800 text-gray-800">
              <th className="py-3 font-semibold">Item Description</th>
              <th className="py-3 font-semibold text-center">Qty</th>
              <th className="py-3 font-semibold text-right">Unit Price</th>
              <th className="py-3 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {order.items.map(item => (
              <tr key={item.id}>
                <td className="py-4">
                  <p className="font-medium text-gray-900">{item.product.name}</p>
                  <p className="text-sm text-gray-500">SKU: {item.product.sku}</p>
                </td>
                <td className="py-4 text-center text-gray-800">{item.quantity}</td>
                <td className="py-4 text-right text-gray-800">${Number(item.unitPrice).toFixed(2)}</td>
                <td className="py-4 text-right font-medium text-gray-900">${Number(item.subtotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end border-t border-gray-200 pt-8">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>${Number(order.taxTotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t border-gray-300">
              <span>Grand Total</span>
              <span>${Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
          <p className="font-medium text-gray-700 mb-1">Thank you for your business!</p>
          <p>This invoice is a permanent, non-editable record generated by the system.</p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { apiClient } from '@/lib/api-client';

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  sellingPrice: number;
  taxPercentage: number;
  stockQuantity: number;
  imageUrl?: string;
  isActive: boolean;
};

type CartItem = Product & {
  cartQuantity: number;
};

export default function PosCheckoutPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [completedOrder, setCompletedOrder] = useState<{ id: string, total: number } | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePhone, setSharePhone] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch all active products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/pos/inventory', { params: { limit: 200 } }); // Fetch up to 200 for quick select
      setProducts(res.data.data.filter((p: Product) => p.isActive));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const lower = search.toLowerCase();
    return products.filter(
      p => p.name.toLowerCase().includes(lower) || 
           p.sku.toLowerCase().includes(lower) || 
           (p.barcode && p.barcode.toLowerCase().includes(lower))
    );
  }, [search, products]);

  // Handle barcode scanner (exact match adds directly to cart)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim() !== '') {
      const exactMatch = products.find(p => p.barcode === search || p.sku === search);
      if (exactMatch) {
        addToCart(exactMatch);
        setSearch(''); // clear search after scan
      }
    }
  };

  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.cartQuantity >= product.stockQuantity) return prev; // prevent overselling
        return prev.map(item => 
          item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
        );
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
    setError('');
    setSuccess('');
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.cartQuantity + delta;
        if (newQ > item.stockQuantity || newQ < 1) return item;
        return { ...item, cartQuantity: newQ };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    cart.forEach(item => {
      const itemSub = Number(item.sellingPrice) * item.cartQuantity;
      const itemTax = (itemSub * Number(item.taxPercentage)) / 100;
      subtotal += itemSub;
      taxTotal += itemTax;
    });
    return { subtotal, taxTotal, total: subtotal + taxTotal };
  }, [cart]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        items: cart.map(item => ({ productId: item.id, quantity: item.cartQuantity })),
        paymentMethod
      };
      const res = await apiClient.post('/pos/checkout', payload);
      setSuccess('Order completed successfully!');
      setCompletedOrder({ id: res.data.id, total: totals.total });
      setCart([]);
      fetchProducts(); // Refresh stock
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Checkout failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = async () => {
    if (!completedOrder || (!shareEmail && !sharePhone)) return;
    setIsSharing(true);
    
    try {
      const promises = [];
      if (shareEmail) {
        promises.push(apiClient.post(`/pos/orders/${completedOrder.id}/share`, { type: 'email', target: shareEmail }));
      }
      if (sharePhone) {
        promises.push(apiClient.post(`/pos/orders/${completedOrder.id}/share`, { type: 'whatsapp', target: sharePhone }));
      }
      
      await Promise.all(promises);
      
      let msg = 'Receipt shared successfully';
      if (shareEmail && sharePhone) msg += ' via Email and WhatsApp!';
      else if (shareEmail) msg += ' via Email!';
      else if (sharePhone) msg += ' via WhatsApp!';
      
      alert(msg);
      setShareEmail('');
      setSharePhone('');
    } catch (err: any) {
      alert(`Failed to share: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden">
      
      {/* Left Panel: Quick Select & Search */}
      <div className="w-2/3 flex flex-col p-4 border-r border-gray-200">
        <div className="mb-4">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search products or scan barcode (Press Enter)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full text-lg border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-gray-500 p-4">Loading products...</div>
          ) : (
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
              {filteredProducts.map(product => {
                const outOfStock = product.stockQuantity <= 0;
                const lowStock = product.stockQuantity > 0 && product.stockQuantity <= 5;
                
                return (
                  <button
                    key={product.id}
                    disabled={outOfStock}
                    onClick={() => addToCart(product)}
                    className={`relative flex flex-col h-32 p-3 rounded-xl border text-left transition-all ${
                      outOfStock 
                        ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed' 
                        : 'bg-white border-gray-200 hover:border-blue-500 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <div className="font-semibold text-gray-800 line-clamp-2">{product.name}</div>
                    <div className="text-sm text-gray-500 mt-1">{product.sku}</div>
                    <div className="mt-auto font-bold text-lg">${Number(product.sellingPrice).toFixed(2)}</div>
                    
                    {/* Stock Badges */}
                    {outOfStock ? (
                      <div className="absolute top-2 right-2 bg-gray-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">
                        Out of Stock
                      </div>
                    ) : lowStock ? (
                      <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">
                        Only {product.stockQuantity} left
                      </div>
                    ) : (
                      <div className="absolute top-2 right-2 bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded-full font-medium">
                        {product.stockQuantity} in stock
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Cart & Checkout */}
      <div className="w-1/3 flex flex-col bg-white shadow-xl relative z-10">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Current Order</h2>
          <button onClick={() => setCart([])} className="text-sm text-red-600 hover:underline">Clear</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-start border-b border-gray-100 pb-3">
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{item.name}</div>
                  <div className="text-sm text-gray-500">${Number(item.sellingPrice).toFixed(2)} / ea</div>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <div className="font-bold text-gray-800">
                    ${(Number(item.sellingPrice) * item.cartQuantity).toFixed(2)}
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 rounded-md p-1">
                    <button 
                      onClick={() => updateCartQuantity(item.id, -1)}
                      className="w-6 h-6 rounded bg-white text-gray-600 shadow-sm hover:bg-gray-50 flex items-center justify-center font-bold"
                    >-</button>
                    <span className="text-sm w-6 text-center font-medium">{item.cartQuantity}</span>
                    <button 
                      disabled={item.cartQuantity >= item.stockQuantity}
                      onClick={() => updateCartQuantity(item.id, 1)}
                      className="w-6 h-6 rounded bg-white text-gray-600 shadow-sm hover:bg-gray-50 flex items-center justify-center font-bold disabled:opacity-50"
                    >+</button>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="ml-3 mt-1 text-gray-400 hover:text-red-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Payment & Summary Box */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-gray-600 text-sm">
              <span>Subtotal</span>
              <span>${totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600 text-sm">
              <span>Tax</span>
              <span>${totals.taxTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-900 text-xl font-bold pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>${totals.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {['Bank Transfer', 'Amwal Pay', 'Thawani Pay'].map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-1 rounded border text-xs font-medium text-center transition-colors ${
                    paymentMethod === method 
                      ? 'bg-blue-50 border-blue-600 text-blue-700' 
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
          {success && <div className="mb-4 text-sm text-green-700 bg-green-50 p-2 rounded">{success}</div>}

          <button 
            disabled={cart.length === 0 || isProcessing}
            onClick={handleCheckout}
            className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isProcessing ? 'Processing...' : `Charge $${totals.total.toFixed(2)}`}
          </button>
        </div>
      </div>

      {/* Success & Share Modal */}
      {completedOrder && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-500 mb-8">Amount Paid: <strong className="text-gray-900">${completedOrder.total.toFixed(2)}</strong></p>

            <div className="text-left bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 space-y-3">
              <label className="block text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">Share Digital Receipt</label>
              
              <input 
                type="email" 
                placeholder="Email Address"
                value={shareEmail}
                onChange={e => setShareEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input 
                type="tel" 
                placeholder="WhatsApp Number (e.g. +1234567890)"
                value={sharePhone}
                onChange={e => setSharePhone(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-[#25D366] outline-none"
              />
              
              <button 
                onClick={handleShare}
                disabled={isSharing || (!shareEmail && !sharePhone)}
                className="w-full bg-blue-500 text-white py-3 rounded font-medium hover:bg-blue-600 disabled:opacity-50 mt-2"
              >
                {isSharing ? 'Sending...' : 'Send Receipt(s)'}
              </button>
            </div>

            <button 
              onClick={() => {
                setCompletedOrder(null);
                setShareEmail('');
                setSharePhone('');
                setSuccess('');
              }}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700"
            >
              Start New Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

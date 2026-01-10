"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { formatCurrency } from '@/utils/vi';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function CartPage() {

  const router = useRouter();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  const handleCheckout = () => {
    if (!isLoggedIn) {
      const checkoutUrl = `/checkout?ids=${selectedItems.join(',')}`;
      router.push(`/login?returnUrl=${encodeURIComponent(checkoutUrl)}`);
    } else {
      router.push(`/checkout?ids=${selectedItems.join(',')}`);
    }
  };

  const { items, removeFromCart, updateQuantity, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, [items]);

  const toggleSelectItem = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((itemId) => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map((item) => item.id));
    }
  };

  const selectedTotal = items
    .filter((item) => selectedItems.includes(item.id))
    .reduce((total, item) => total + item.price * item.quantity, 0);

  if (!mounted) return <div className="p-10 text-center">Đang tải...</div>;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h2 className="text-2xl font-bold text-gray-700">Giỏ hàng của bạn đang trống</h2>
        <Link href="/" className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Giỏ hàng ({items.length} sản phẩm)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">

          <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedItems.length === items.length && items.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 accent-green-600 cursor-pointer"
              />
              <span className="ml-3 text-gray-700 font-medium cursor-pointer" onClick={toggleSelectAll}>
                Chọn tất cả ({items.length})
              </span>
            </div>
            <button
              onClick={() => {
                clearCart();
                setSelectedItems([]);
              }}
              className="text-red-500 hover:text-red-700 font-medium text-sm hover:underline"
            >
              Xóa tất cả
            </button>
          </div>

          {items.map((item) => (
            <div key={item.id} className="flex items-center bg-white p-4 rounded-lg shadow border border-gray-100">

              <input
                type="checkbox"
                checked={selectedItems.includes(item.id)}
                onChange={() => toggleSelectItem(item.id)}
                className="w-5 h-5 mr-4 text-green-600 border-gray-300 rounded focus:ring-green-500 accent-green-600 cursor-pointer flex-shrink-0"
              />

              <div className="relative w-24 h-24 flex-shrink-0 border rounded overflow-hidden">
                <img
                  src={Array.isArray(item.images) ? item.images[0] : item.images || '/placeholder.png'}
                  alt={item.name}
                  className="object-cover w-full h-full"
                />
              </div>

              <div className="ml-4 flex-grow">
                <h3 className="text-lg font-semibold text-gray-800 line-clamp-1">{item.name}</h3>
                <p className="text-green-600 font-medium">{formatCurrency(item.price)}</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-8 h-8 rounded bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center justify-center font-bold shadow-sm"
                >
                  -
                </button>

                <span className="w-8 text-center font-bold text-black text-lg">{item.quantity}</span>

                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 rounded bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center justify-center font-bold shadow-sm"
                >
                  +
                </button>
              </div>

              <button
                onClick={() => {
                  removeFromCart(item.id);
                  setSelectedItems(prev => prev.filter(id => id !== item.id));
                }}
                className="ml-6 text-gray-400 hover:text-red-500 transition-colors"
                title="Xóa sản phẩm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-100 h-fit sticky top-4">
          <h3 className="text-xl font-bold mb-4">Tổng quan đơn hàng</h3>

          <div className="flex justify-between mb-2 text-gray-600">
            <span>Đã chọn:</span>
            <span>{selectedItems.length} sản phẩm</span>
          </div>

          <div className="flex justify-between mb-2 text-gray-600">
            <span>Tạm tính:</span>
            <span>{formatCurrency(selectedTotal)}</span>
          </div>

          <div className="flex justify-between mb-4 text-gray-600">
            <span>Phí vận chuyển:</span>
            <span>Miễn phí</span>
          </div>
          <hr className="my-4" />
          <div className="flex justify-between mb-6 text-xl font-bold text-green-700">
            <span>Tổng thanh toán:</span>
            <span>{formatCurrency(selectedTotal)}</span>
          </div>

          {selectedItems.length > 0 ? (
            <button
              onClick={handleCheckout}
              className="block text-center w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition shadow-lg shadow-green-200"
            >
              Mua hàng ({selectedItems.length})
            </button>
          ) : (
            <button
              disabled
              className="w-full bg-gray-300 text-gray-500 py-3 rounded-lg font-bold cursor-not-allowed"
            >
              Vui lòng chọn sản phẩm
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
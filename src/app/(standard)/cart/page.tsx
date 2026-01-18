"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { formatCurrency } from '@/utils/vi';
import { useRouter } from 'next/navigation';
// 1. Dùng Context thay vì Store cũ
import { useAuth } from '@/context/AuthContext';
import { ShoppingCart, Trash2, Minus, Plus, ArrowRight, Check } from 'lucide-react';
import Image from 'next/image';

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth(); // Lấy thông tin user
  
  const { items, removeFromCart, updateQuantity, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, [items]);

  // Logic Chọn/Bỏ chọn sản phẩm
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

  const handleCheckout = () => {
    const checkoutUrl = `/checkout?ids=${selectedItems.join(',')}`;
    
    // Nếu chưa đăng nhập -> Chuyển sang login kèm returnUrl
    if (!user) {
      router.push(`/login?returnUrl=${encodeURIComponent(checkoutUrl)}`);
    } else {
      router.push(checkoutUrl);
    }
  };

  const selectedTotal = items
    .filter((item) => selectedItems.includes(item.id))
    .reduce((total, item) => total + item.price * item.quantity, 0);

  if (!mounted) return <div className="min-h-screen flex items-center justify-center text-gray-500">Đang tải giỏ hàng...</div>;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-2">
           <ShoppingCart size={48} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Giỏ hàng của bạn đang trống</h2>
        <p className="text-gray-500 max-w-md text-center">Hãy dạo quanh một vòng và chọn những sản phẩm tươi ngon nhất cho gia đình nhé!</p>
        <Link href="/products" className="px-8 py-3 bg-green-600 text-white rounded-full font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all hover:scale-105">
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 flex items-center gap-3">
        <ShoppingCart className="text-green-600"/> Giỏ hàng <span className="text-lg font-normal text-gray-500">({items.length} sản phẩm)</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- CỘT TRÁI: DANH SÁCH SẢN PHẨM --- */}
        <div className="lg:col-span-2 space-y-4">

          {/* Header chọn tất cả */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedItems.length === items.length && items.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 accent-green-600 cursor-pointer"
              />
              <span className="ml-3 text-gray-700 font-medium cursor-pointer select-none" onClick={toggleSelectAll}>
                Chọn tất cả ({items.length})
              </span>
            </div>
            <button
              onClick={() => { clearCart(); setSelectedItems([]); }}
              className="text-red-500 hover:text-red-700 font-medium text-sm hover:underline flex items-center gap-1"
            >
              <Trash2 size={16} /> Xóa tất cả
            </button>
          </div>

          {/* List Item */}
          {items.map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4 transition-all hover:shadow-md">
              
              {/* Checkbox & Image */}
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => toggleSelectItem(item.id)}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 accent-green-600 cursor-pointer flex-shrink-0"
                />
                <div className="relative w-24 h-24 flex-shrink-0 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <Image
                    src={Array.isArray(item.images) ? item.images[0] : item.images || '/placeholder.png'}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 w-full text-center sm:text-left">
                <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{item.name}</h3>
                <p className="text-sm text-gray-500 mb-1">Đơn vị: kg</p>
                <p className="text-green-600 font-bold text-lg">{formatCurrency(item.price)}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between w-full sm:w-auto gap-6">
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-200 text-gray-600 transition"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-10 text-center font-bold text-gray-800 text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-200 text-gray-600 transition"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    removeFromCart(item.id);
                    setSelectedItems(prev => prev.filter(id => id !== item.id));
                  }}
                  className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition"
                  title="Xóa sản phẩm"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* --- CỘT PHẢI: TỔNG QUAN --- */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
            <h3 className="text-xl font-bold mb-6 text-gray-900 border-b pb-4">Tổng quan đơn hàng</h3>

            <div className="space-y-3 mb-6">
               <div className="flex justify-between text-gray-600 text-sm">
                 <span>Tạm tính ({selectedItems.length} món):</span>
                 <span className="font-medium text-gray-900">{formatCurrency(selectedTotal)}</span>
               </div>
               <div className="flex justify-between text-gray-600 text-sm">
                 <span>Giảm giá:</span>
                 <span className="font-medium text-gray-900">0đ</span>
               </div>
               <div className="flex justify-between text-gray-600 text-sm">
                 <span>Phí vận chuyển:</span>
                 <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-0.5 rounded">Miễn phí</span>
               </div>
            </div>

            <div className="flex justify-between items-end mb-6 pt-4 border-t border-dashed border-gray-200">
              <span className="font-bold text-gray-700">Tổng thanh toán:</span>
              <div className="text-right">
                 <span className="block text-2xl font-bold text-green-600">{formatCurrency(selectedTotal)}</span>
                 <span className="text-xs text-gray-400 font-normal">(Đã bao gồm VAT)</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={selectedItems.length === 0}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                 selectedItems.length > 0 
                 ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/30 hover:scale-[1.02]' 
                 : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {selectedItems.length > 0 ? (
                 <>Mua Hàng ({selectedItems.length}) <ArrowRight size={20}/></>
              ) : (
                 'Chọn sản phẩm để mua'
              )}
            </button>
            
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
               <Check size={14} className="text-green-600"/> Cam kết chính hãng 100%
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
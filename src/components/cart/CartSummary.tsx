// src/components/cart/CartSummary.tsx
'use client';
import React from 'react';

export const CartSummary = () => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };
  
  const subtotal = 290000; 
  const shipping = 15000;  
  const total = subtotal + shipping;
  
  return (
    <div className="bg-white p-6 border rounded-lg shadow-sm space-y-4 sticky top-24">
      <h2 className="text-xl font-semibold text-gray-800">Tóm tắt đơn hàng</h2>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Tạm tính</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
         <div className="flex justify-between text-gray-600">
          <span>Phí vận chuyển</span>
          <span>{formatCurrency(shipping)}</span>
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-4">
         <div className="flex justify-between font-semibold text-lg text-gray-800">
          <span>Tổng cộng</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
      
      <button className="w-full bg-green-600 text-white font-semibold py-3 rounded-full shadow-md hover:bg-green-700 transition-colors">
        Tiến hành thanh toán
      </button>
    </div>
  );
};
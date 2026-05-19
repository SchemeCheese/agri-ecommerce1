// src/components/cart/CartItem.tsx
'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, Minus, X } from 'lucide-react';

interface CartItemProps {
  item: {
    id: string;
    imageUrl: string;
    title: string;
    price: number;
    quantity: number;
    unit: string;
  };
}

export const CartItem = ({ item }: CartItemProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // ProductCard uses product.id as the slug param for /products/[slug], matching here.
  const productHref = `/products/${item.id}`;

  return (
    <div className="flex items-center bg-white p-4 border rounded-lg shadow-sm">
      <Link href={productHref} className="relative w-20 h-20 rounded-md overflow-hidden block group">
        <Image
          src={item.imageUrl}
          alt={item.title}
          fill
          sizes="80px"
          className="object-cover transition-transform group-hover:scale-105"
        />
      </Link>

      <div className="flex-1 ml-4">
        <Link
          href={productHref}
          className="font-semibold text-gray-800 hover:text-green-700 transition-colors line-clamp-2"
        >
          {item.title}
        </Link>
        <p className="text-sm text-gray-500 mt-0.5">{formatCurrency(item.price)} / {item.unit}</p>
      </div>
      
      <div className="flex items-center border border-gray-200 rounded-full mx-4">
        <button className="p-2 text-gray-500 hover:text-green-600">
          <Minus size={14} />
        </button>
        <span className="px-3 text-sm font-semibold">{item.quantity}</span>
        <button className="p-2 text-gray-500 hover:text-green-600">
          <Plus size={14} />
        </button>
      </div>
      
      <div className="w-24 text-right font-semibold text-gray-800">
        {formatCurrency(item.price * item.quantity)}
      </div>
      
      <button className="ml-4 text-gray-400 hover:text-red-500">
        <X size={18} />
      </button>
    </div>
  );
};
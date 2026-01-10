// src/components/home/ProductCard.tsx
import React from 'react';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  imageUrl: string;
  title: string;
  description: string;
  price: string;
}

// thêm cấu hình cho domain ảnh trong `next.config.mjs`nếu dùng ảnh từ bên ngoài.
// images: {
//   domains: ['example.com'],
// },

export const ProductCard = ({ imageUrl, title, description, price }: ProductCardProps) => {
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 bg-white">
      <div className="relative w-full h-48">
        <Image
          src={imageUrl}
          alt={title}
          layout="fill"
          objectFit="cover"
          className="transition-transform duration-300 hover:scale-105"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-800 mb-1">{title}</h3>
        <p className="text-sm text-gray-600 mb-3 h-10">{description}</p>
        <div className="flex justify-between items-center">
          <p className="font-bold text-green-600 text-lg">{price}</p>
          <button className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-600 hover:text-white transition-colors">
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
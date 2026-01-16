// src/components/home/TopShops.tsx
import React from 'react';
import Image from 'next/image';
import { TOP_SHOPS } from '@/data'; // Đã sửa import
import { Container } from '@/components/ui/Container';
import { Star, Store } from 'lucide-react';

export const TopShops = () => {
  return (
    <section className="py-12 bg-gray-50">
      <Container>
        <div className="flex items-center gap-2 mb-6">
          <Store className="text-green-600 w-6 h-6" />
          <h2 className="font-bold text-2xl text-gray-900">Shop Nổi Bật Hàng Đầu</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {TOP_SHOPS.map((shop) => (
            <div key={shop.id} className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col items-center text-center">
              <div className="relative w-20 h-20 mb-4">
                <Image 
                  src={shop.avatar} 
                  alt={shop.name}
                  fill
                  className="rounded-full object-cover border-2 border-green-100 p-1"
                />
                <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-white text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center shadow-sm">
                  {shop.rating} <Star className="w-3 h-3 fill-white ml-0.5" />
                </div>
              </div>
              
              <h3 className="font-bold text-gray-800 text-lg mb-1">{shop.name}</h3>
              <p className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium">
                {shop.highlight}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};
// src/components/home/TopShops.tsx
'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Star, Store, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

const BACKEND_URL = 'http://localhost:3001';
const fixImg = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
};

export const TopShops = () => {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/products')
      .then(res => {
        const products: any[] = res.data;
        // Trích xuất shop duy nhất không trùng seller_id
        const shopMap = new Map<string, any>();
        for (const p of products) {
          const sellerId = p.seller_id || p.seller?.id;
          if (sellerId && !shopMap.has(sellerId)) {
            const sellerProfile = p.seller?.profile;
            shopMap.set(sellerId, {
              id: sellerId,
              name: sellerProfile?.store_name || p.seller?.full_name || 'Agri Shop',
              avatar: fixImg(sellerProfile?.avatar_url || p.seller?.avatar || ''),
              rating: sellerProfile?.rating || (4.5 + Math.random() * 0.5).toFixed(1),
              highlight: sellerProfile?.store_address || 'Nông sản sạch',
            });
          }
          if (shopMap.size >= 8) break;
        }
        setShops(Array.from(shopMap.values()).slice(0, 4));
      })
      .catch(err => console.error('TopShops error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <section className="py-12 bg-gray-50">
      <Container>
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-green-600" size={28}/>
        </div>
      </Container>
    </section>
  );

  if (shops.length === 0) return null;

  return (
    <section className="py-12 bg-gray-50">
      <Container>
        <div className="flex items-center gap-2 mb-6">
          <Store className="text-green-600 w-6 h-6" />
          <h2 className="font-bold text-2xl text-gray-900">Shop Nổi Bật Hàng Đầu</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {shops.map((shop) => (
            <Link key={shop.id} href={`/shop/${shop.id}`}
              className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col items-center text-center group"
            >
              <div className="relative w-20 h-20 mb-4 rounded-full overflow-hidden border-2 border-green-100 bg-green-50 flex items-center justify-center">
                {shop.avatar ? (
                  <img src={shop.avatar} alt={shop.name} className="w-full h-full object-cover rounded-full"/>
                ) : (
                  <Store className="text-green-600 w-8 h-8"/>
                )}
                <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-white text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center shadow-sm">
                  {shop.rating} <Star className="w-3 h-3 fill-white ml-0.5" />
                </div>
              </div>
              <h3 className="font-bold text-gray-800 text-base mb-1 group-hover:text-green-700 transition-colors line-clamp-1">{shop.name}</h3>
              <p className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium line-clamp-1">
                {shop.highlight}
              </p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
};

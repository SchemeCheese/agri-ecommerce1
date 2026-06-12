// src/components/home/TopShops.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { BadgeCheck, ExternalLink, Star, Store, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import { resolveImageUrl } from '@/lib/runtime-config';

const fixImg = (url: string) => resolveImageUrl(url) || '';

// Defensive: a `http(s)://` value that ended up in the address field is not
// a human-readable label — skip it so we never show a raw URL on the card.
const isUrlLike = (v: unknown) => typeof v === 'string' && /^https?:\/\//i.test(v.trim());
const cleanLabel = (v: unknown) =>
  typeof v === 'string' && v.trim() && !isUrlLike(v) ? v.trim() : '';

// Display priority for the featured-shop card badge:
//   shop_location_name → location → address → 'Xem vị trí'
function pickLocationLabel(shop: {
  shop_location_name?: string | null;
  location?: string | null;
  address?: string | null;
}): string {
  return (
    cleanLabel(shop.shop_location_name) ||
    cleanLabel(shop.location) ||
    cleanLabel(shop.address) ||
    'Xem vị trí'
  );
}

interface TopShopCard {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  totalSales: number;
  totalReviews: number;
  isVerified: boolean;
  shop_location_name: string | null;
  address: string | null;
  location: string | null;
  shop_maps_open_url: string | null;
}

export const TopShops = () => {
  const router = useRouter();
  const [shops, setShops] = useState<TopShopCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/shops/top', { params: { limit: 4, sort: 'sales' } })
      .then(res => {
        const data: any[] = Array.isArray(res.data) ? res.data : [];
        setShops(data.map((s): TopShopCard => ({
          id: s.id,
          name: s.store_name || 'Agri Shop',
          avatar: fixImg(s.avatar_url || ''),
          rating: s.avg_rating ?? 5,
          totalSales: s.total_sales ?? 0,
          totalReviews: s.total_reviews ?? 0,
          isVerified: s.is_verified ?? false,
          // Pass through all location fields — the card renderer applies the priority chain.
          shop_location_name: s.shop_location_name ?? null,
          address: s.address ?? s.store_address ?? null,
          location: s.store_address ?? s.address ?? null,
          shop_maps_open_url: s.shop_maps_open_url ?? null,
        })));
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
          {shops.map((shop) => {
            const label = pickLocationLabel(shop);
            const mapsUrl = shop.shop_maps_open_url;
            const openShop = () => router.push(`/shop/${shop.id}`);
            return (
              // Card is a clickable div instead of <Link> so the Maps anchor below
              // can be a real <a> without producing invalid nested anchors.
              <div
                key={shop.id}
                role="link"
                tabIndex={0}
                onClick={openShop}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openShop(); } }}
                className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col items-center text-center group cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500/40"
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
                {shop.isVerified ? (
                  <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                    <BadgeCheck className="h-3.5 w-3.5 fill-amber-400 text-amber-600" />
                    Đã xác minh
                  </div>
                ) : null}
                <p className="text-xs text-gray-400 mb-1">{shop.totalReviews} đánh giá · {shop.totalSales} đã bán</p>

                {/* Location badge — anchored to Google Maps when the BE resolved a URL.
                    stopPropagation keeps the parent card-click from navigating to /shop/[id]. */}
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-sm text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-full font-medium line-clamp-1 max-w-full transition-colors"
                    title="Mở Google Maps"
                  >
                    <span className="truncate">{label}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-70" />
                  </a>
                ) : (
                  <p className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium line-clamp-1">
                    {label}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
};

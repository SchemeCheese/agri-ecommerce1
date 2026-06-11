// src/app/(standard)/shop/[id]/page.tsx

import React from 'react';
import { notFound } from 'next/navigation';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/runtime-config';
import ShopClient from './ShopClient';

const BACKEND_URL = API_BASE_URL;

export default async function ShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // Dùng endpoint mới: GET /shops/:id
    const res = await axios.get(`${BACKEND_URL}/shops/${id}`);
    const data = res.data;

    let shopProducts: any[] = [];
    let shopInfo: any = {};

    if (Array.isArray(data)) {
      shopProducts = data;
      const first = shopProducts[0];
      shopInfo = first?.shop || {};
    } else {
      shopProducts = data.products || [];
      shopInfo = data.shop || data || {};
    }

    if (shopProducts.length === 0 && !shopInfo.id) return notFound();

    const shop = {
      id,
      name: shopInfo.store_name || shopInfo.name || data.full_name || 'Agri Shop',
      avatar: shopInfo.avatar_url || shopInfo.avatar || '',
      banner: shopInfo.banner_url || shopInfo.banner || '',
      description: shopInfo.store_description || shopInfo.description || '',
      // `location` is the legacy alias; `address` is the raw column value.
      // Both are forwarded so ShopClient can honor the spec priority chain literally.
      location: shopInfo.store_address || shopInfo.address || shopInfo.location || '',
      address: shopInfo.address || shopInfo.store_address || '',
      isVerified: shopInfo.isVerified ?? shopInfo.is_verified ?? false,
      trustStatus: shopInfo.trust_status ?? 'NORMAL',
      rating: shopInfo.avg_rating ?? data.averageRating ?? 5,
      totalSold: shopInfo.total_sales ?? data.totalSold ?? 0,
      responseRate: '100%',
      totalProducts: shopProducts.length,
      joinDate: shopInfo.joinDate || '',
      // ─── Shop location / Google Maps (resolved server-side by BE) ──────
      shop_location_name: shopInfo.shop_location_name ?? '',
      shop_google_maps_url: shopInfo.shop_google_maps_url ?? '',
      shop_maps_open_url: shopInfo.shop_maps_open_url ?? '',
      // ─── Carousel banners (BE caps at 3, paths are relative) ───────────
      banners: Array.isArray(shopInfo.banners) ? shopInfo.banners.slice(0, 3) : [],
    };

    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        <ShopClient shop={shop} products={shopProducts} />
      </div>
    );
  } catch (error) {
    console.error('ShopDetailPage error:', error);
    return notFound();
  }
}

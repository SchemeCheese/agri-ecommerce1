// src/app/(standard)/shop/[id]/page.tsx

import React from 'react';
import { notFound } from 'next/navigation';
import axios from 'axios';
import ShopClient from './ShopClient';

const BACKEND_URL = 'http://localhost:3001';

export default async function ShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // Dùng endpoint mới: GET /products/sellers/:id
    const res = await axios.get(`${BACKEND_URL}/products/sellers/${id}`);
    const data = res.data;

    // BE có thể trả về dạng { shop, products, averageRating, totalSold }
    // hoặc dạng array nếu chỉ trả products trực tiếp
    let shopProducts: any[] = [];
    let shopInfo: any = {};

    if (Array.isArray(data)) {
      // Trường hợp BE trả thẳng mảng products
      shopProducts = data;
      const first = shopProducts[0];
      shopInfo = first?.shop || {};
    } else {
      // Trường hợp BE trả object có shop + products
      shopProducts = data.products || [];
      shopInfo = data.shop || {};
    }

    if (shopProducts.length === 0 && !shopInfo.id) return notFound();

    const shop = {
      id,
      name: shopInfo.name || shopInfo.store_name || data.full_name || 'Agri Shop',
      avatar: shopInfo.avatar || shopInfo.avatar_url || '',
      banner: shopInfo.banner || shopInfo.banner_url || '',
      description: shopInfo.description || shopInfo.store_description || '',
      location: shopInfo.location || shopInfo.address || shopInfo.store_address || '',
      isVerified: shopInfo.isVerified ?? shopInfo.is_verified ?? false,
      rating: data.averageRating ?? shopInfo.rating ?? 5,
      totalSold: data.totalSold ?? 0,
      responseRate: '100%',
      totalProducts: shopProducts.length,
      joinDate: shopInfo.joinDate || '',
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

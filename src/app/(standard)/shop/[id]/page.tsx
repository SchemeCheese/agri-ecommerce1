// src/app/(standard)/shop/[id]/page.tsx

import React from 'react';
import { notFound } from 'next/navigation';
import { MOCK_PRODUCTS, TOP_SHOPS } from '@/data';
import ShopClient from './ShopClient';

export default async function ShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. Tìm thông tin Shop
  const shop = TOP_SHOPS.find((s) => s.id === id);
  if (!shop) return notFound();

  // 2. Lấy tất cả sản phẩm của Shop này
  const shopProducts = MOCK_PRODUCTS.filter((p) => p.shop.id === id);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <ShopClient shop={shop} products={shopProducts} />
    </div>
  );
}
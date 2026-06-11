// src/app/(seller)/layout.tsx
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { SellerSidebar } from '@/components/seller/common/SellerSidebar';
import { SellerHeader } from '@/components/seller/common/SellerHeader';
import { SellerAIWidget } from '@/components/seller/common/SellerAIWidget';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Gate theo activeRole (workspace đang dùng), KHÔNG chỉ theo quyền sở hữu. Một
  // user sở hữu cả 2 vai trò nhưng đang ở workspace BUYER phải bấm "Đổi vai trò"
  // (đổi activeRole=SELLER) mới vào được — khớp với enforcement strict ở BE guard.
  // Token cũ chưa có activeRole → fallback theo is_seller để không khoá nhầm.
  const inSellerMode = user?.activeRole ? user.activeRole === 'SELLER' : !!user?.is_seller;

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (!inSellerMode) {
        // Đang ở workspace BUYER (hoặc chưa có quyền seller) → về trang chủ.
        router.push('/');
      }
    }
  }, [user, isLoading, inSellerMode, router]);

  if (isLoading || !user || !inSellerMode) {
    return <div className="h-screen flex items-center justify-center">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-gray-900">
      <SellerSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <SellerHeader />
        <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1600px] mx-auto w-full">
          {children}
        </div>
      </main>
      {/* Nút nổi trợ lý AI (mode SELLER) — chỉ hiện trong workspace người bán */}
      <SellerAIWidget />
    </div>
  );
}
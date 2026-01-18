import React from 'react';
import { SellerSidebar } from '@/components/seller/common/SellerSidebar';
import { SellerHeader } from '@/components/seller/common/SellerHeader';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-gray-900">
      <SellerSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <SellerHeader />
        
        {/* Content Wrapper */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1600px] mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
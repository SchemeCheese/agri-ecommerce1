// src/app/(standard)/layout.tsx
import React from 'react';
import { HeaderSecondary } from '@/components/layouts/HeaderSecondary';
import { Footer } from '@/components/layouts/Footer';

// Layout này sẽ áp dụng cho tất cả các trang bên trong (standard)
// như /products, /cart, /products/[slug]...
export default function StandardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="font-sans antialiased">
      <HeaderSecondary />
      <main className="bg-white">
        {children}
      </main>
      <Footer />
    </div>
  );
}
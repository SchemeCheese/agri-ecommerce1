// src/app/page.tsx
'use client'; 
import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layouts/Header';
import { Footer } from '@/components/layouts/Footer'; // Import Footer
import { BannerSlider } from '@/components/home/BannerSlider';
import { SearchBar } from '@/components/home/SearchBar';
import { ProductList } from '@/components/home/ProductList'; // Import ProductList
import { Gallery } from '@/components/home/Gallery';     // Import Gallery
import { Promotions } from '@/components/home/Promotions'; // Import Promotions
import { useTranslation } from '@/hooks/useTranslation';

// Đường dẫn logo
const LOGO_LIGHT = '/logos/agri-logo-light.png'; 
const LOGO_DARK = '/logos/agri-logo-dark.png';  

export default function HomePage() {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [logoSrc, setLogoSrc] = useState(LOGO_LIGHT);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      if (scrollPosition > 50) { 
        setIsScrolled(true);
        setLogoSrc(LOGO_DARK); 
      } else {
        setIsScrolled(false);
        setLogoSrc(LOGO_LIGHT); 
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="font-sans antialiased">
      <Header isScrolled={isScrolled} logoSrc={logoSrc} />

      <main>
        {/* Phần 1: Banner & Search (Giống dự án khách sạn) */}
        <section className="relative">
          <BannerSlider />
          <div className="absolute inset-x-0 bottom-10 sm:bottom-20 z-10 px-4">
             <SearchBar />
             <div className="text-center mt-6">
                 <button className="bg-white/90 text-green-700 font-semibold px-8 py-3 rounded-full shadow-md hover:bg-white transition-colors text-sm uppercase tracking-wide">
                     {t('explore')}
                 </button>
             </div>
          </div>
           <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/50 to-transparent"></div>
        </section>

        {/* Phần 2: Danh sách Sản phẩm (Clone từ BranchList) */}
        <ProductList />

        {/* Phần 3: Quảng cáo/Ưu đãi (Clone từ Advertisement) */}
        <Promotions />

        {/* Phần 4: Bộ sưu tập ảnh (Clone từ Gallery) */}
        <Gallery />
        
        {/* Bạn có thể thêm các section khác (contact, about) ở đây nếu muốn */}
        
      </main>

      {/* Phần 5: Footer (Clone từ Footer) */}
      <Footer />
    </div>
  );
};
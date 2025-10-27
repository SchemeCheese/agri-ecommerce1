// src/components/home/Promotions.tsx
import React from 'react';
import { Container } from '@/components/ui/Container';
import Image from 'next/image';

export const Promotions = () => {
  return (
    <section id="promotions" className="py-16 bg-white">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-lime-50 rounded-lg shadow-lg overflow-hidden p-8">
          {/* Cột Văn bản */}
          <div className="text-center md:text-left">
            <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wide">
              Ưu đãi đặc biệt
            </h3>
            <h2 className="text-3xl font-bold text-gray-800 mt-2 mb-4">
              Giảm 20% cho tất cả Rau củ
            </h2>
            <p className="text-gray-600 mb-6">
              Nhập mã <span className="font-bold text-green-700">RAUSACH20</span> khi
              thanh toán để nhận ngay ưu đãi cho đơn hàng rau củ đầu tiên của bạn.
              Nhanh tay lên, số lượng có hạn!
            </p>
            <button className="bg-green-600 text-white font-semibold px-6 py-3 rounded-full shadow-md hover:bg-green-700 transition-colors text-sm uppercase tracking-wide">
              Mua ngay
            </button>
          </div>
          
          {/* Cột Hình ảnh */}
          <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden">
            <Image
              src="/images/nongsan/promo-1.jpg" // Đặt ảnh vào /public/images/nongsan/
              alt="Quảng cáo rau củ"
              layout="fill"
              objectFit="cover"
            />
          </div>
        </div>
      </Container>
    </section>
  );
};
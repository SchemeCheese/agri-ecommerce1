// src/app/(standard)/products/[slug]/page.tsx
'use client';
import React from 'react';
import { Container } from '@/components/ui/Container';
import { ProductGallery } from '@/components/product-detail/ProductGallery'; // Mới
import { ProductInfo } from '@/components/product-detail/ProductInfo';     // Mới
import { ProductList } from '@/components/home/ProductList'; // Tái sử dụng cho "Sản phẩm liên quan"

// Component này sẽ nhận `params` (chứa slug)
export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  // Sau này, bạn sẽ dùng params.slug để fetch API
  // console.log(params.slug); 
  
  // Dữ liệu mẫu (bạn sẽ fetch dựa trên slug)
  const product = {
    name: 'Dâu tây Đà Lạt',
    price: '120.000đ / kg',
    description: 'Dâu tây tươi, mọng nước, chuẩn VietGAP. Giống dâu New Zealand, vị ngọt thanh, thơm dịu. Được trồng theo tiêu chuẩn hữu cơ, không thuốc trừ sâu, đảm bảo an toàn cho sức khỏe.',
    images: [
      { id: '1', src: '/images/nongsan/product-1.jpg' },
      { id: '2', src: '/images/nongsan/gallery-2.jpg' },
      { id: '3', src: '/images/nongsan/gallery-1.jpg' },
    ],
    sku: 'NS-DTDL-001',
    category: 'Trái cây',
  };

  return (
    <div className="py-12">
      <Container>
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Cột trái: Bộ sưu tập ảnh */}
          <div className="w-full lg:w-1/2">
            <ProductGallery images={product.images} />
          </div>
          
          {/* Cột phải: Thông tin sản phẩm */}
          <div className="w-full lg:w-1/2">
            <ProductInfo product={product} />
          </div>
        </div>
        
        {/* Phần sản phẩm liên quan */}
        <div className="mt-24">
           <h2 className="text-3xl font-bold text-center mb-10 text-gray-800">
             Sản phẩm liên quan
           </h2>
           {/* Tái sử dụng ProductList, nhưng chỉ hiện 1 hàng */}
           <ProductList /> 
        </div>
      </Container>
    </div>
  );
}
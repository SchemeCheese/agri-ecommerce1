// src/app/(standard)/products/[slug]/page.tsx
'use client';
import React from 'react';
import { Container } from '@/components/ui/Container';
import { ProductGallery } from '@/components/product-detail/ProductGallery';
import { ProductInfo } from '@/components/product-detail/ProductInfo';     
import { ProductList } from '@/components/home/ProductList'; 

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  // dùng params.slug để fetch API
  // console.log(params.slug); 
  
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
          <div className="w-full lg:w-1/2">
            <ProductGallery images={product.images} />
          </div>
          
          <div className="w-full lg:w-1/2">
            <ProductInfo product={product} />
          </div>
        </div>
        
        <div className="mt-24">
           <h2 className="text-3xl font-bold text-center mb-10 text-gray-800">
             Sản phẩm liên quan
           </h2>
           <ProductList /> 
        </div>
      </Container>
    </div>
  );
}
// src/app/(standard)/products/page.tsx
import React from 'react';
import { Container } from '@/components/ui/Container';
import { ProductCard } from '@/components/home/ProductCard'; 
import { FilterSidebar } from '@/components/products/FilterSidebar';

const allProducts = [
  { imageUrl: '/images/nongsan/product-1.jpg', title: 'Dâu tây Đà Lạt', description: 'Dâu tây tươi, mọng nước.', price: '120.000đ / kg' },
  { imageUrl: '/images/nongsan/product-2.jpg', title: 'Bơ sáp 034', description: 'Bơ sáp dẻo, béo ngậy.', price: '80.000đ / kg' },
  { imageUrl: '/images/nongsan/product-3.jpg', title: 'Rau xà lách Hydroponics', description: 'Trồng thủy canh, an toàn.', price: '50.000đ / kg' },
  { imageUrl: '/images/nongsan/product-4.jpg', title: 'Gạo ST25', description: 'Gạo ngon nhất thế giới.', price: '200.000đ / 5kg' },
  { imageUrl: '/images/nongsan/product-1.jpg', title: 'Dâu tây (Loại 2)', description: 'Dâu tây tươi, mọng nước.', price: '90.000đ / kg' },
  { imageUrl: '/images/nongsan/product-2.jpg', title: 'Bơ sáp (Loại 2)', description: 'Bơ sáp dẻo, béo ngậy.', price: '60.000đ / kg' },
];

export default function ProductsPage() {
  return (
    <div className="py-12">
      <Container>
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Tất cả sản phẩm
        </h1>
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-1/4 lg:w-1/5">
            <FilterSidebar />
          </aside>
          
          <main className="w-full md:w-3/4 lg:w-4/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {allProducts.map((product) => (
                <ProductCard
                  key={product.title}
                  imageUrl={product.imageUrl}
                  title={product.title}
                  description={product.description}
                  price={product.price}
                />
              ))}
            </div>
            {/* (Pagination) */}
          </main>
        </div>
      </Container>
    </div>
  );
}
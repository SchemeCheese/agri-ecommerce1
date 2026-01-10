// src/components/home/ProductList.tsx
import React from 'react';
import { Container } from '@/components/ui/Container';
import { ProductCard } from './ProductCard';

const featuredProducts = [
  {
    imageUrl: '/images/nongsan/product-1.jpg', 
    title: 'Dâu tây Đà Lạt',
    description: 'Dâu tây tươi, mọng nước, chuẩn VietGAP.',
    price: '120.000đ / kg',
  },
  {
    imageUrl: '/images/nongsan/product-2.jpg',
    title: 'Bơ sáp 034',
    description: 'Bơ sáp dẻo, béo ngậy, không sượng.',
    price: '80.000đ / kg',
  },
  {
    imageUrl: '/images/nongsan/product-3.jpg',
    title: 'Rau xà lách Hydroponics',
    description: 'Trồng thủy canh, an toàn tuyệt đối.',
    price: '50.000đ / kg',
  },
  {
    imageUrl: '/images/nongsan/product-4.jpg',
    title: 'Gạo ST25',
    description: 'Gạo ngon nhất thế giới, hạt dài, thơm.',
    price: '200.000đ / 5kg',
  },
];

export const ProductList = () => {
  return (
    <section id="products" className="py-16 bg-white">
      <Container>
        <h2 className="text-3xl font-bold text-center mb-10 text-gray-800">
          Sản phẩm nổi bật
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.title}
              imageUrl={product.imageUrl}
              title={product.title}
              description={product.description}
              price={product.price}
            />
          ))}
        </div>
      </Container>
    </section>
  );
};
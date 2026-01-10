import React from 'react';
import { Container } from '@/components/ui/Container'; 
import { ProductCard } from './ProductCard';
import { MOCK_PRODUCTS } from '@/data/mockData'; 

export const ProductList = () => {
  const featuredProducts = MOCK_PRODUCTS.slice(0, 4);

  return (
    <section id="products" className="py-16 bg-white">
      <Container> 
        <h2 className="text-3xl font-bold text-center mb-10 text-gray-800">
          Sản phẩm nổi bật
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id} 
              id={product.id} 
              imageUrl={product.images[0]} 
              title={product.name}
              description={product.description}
              price={`${product.price.toLocaleString('vi-VN')}đ / kg`}
              rawPrice={product.price} 
            />
          ))}
        </div>
      </Container>
    </section>
  );
};
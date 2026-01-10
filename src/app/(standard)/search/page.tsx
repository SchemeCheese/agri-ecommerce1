"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MOCK_PRODUCTS } from '@/data/mockData';
import { ProductCard } from '@/components/home/ProductCard';
import { formatCurrency } from '@/utils/vi';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.toLowerCase() || '';

  const results = MOCK_PRODUCTS.filter((product) => 
    product.name.toLowerCase().includes(query)
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        Kết quả tìm kiếm cho: "<span className="text-green-600">{query}</span>"
      </h1>
      
      {results.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg border">
          <p className="text-gray-500 text-lg">Không tìm thấy sản phẩm nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {results.map((product) => (
             <div key={product.id}>
               <ProductCard
                 id={product.id}
                 slug={product.slug}
                 imageUrl={product.images[0]}
                 title={product.name}
                 description={product.description}
                 price={formatCurrency(product.price)}
                 rawPrice={product.price}
               />
             </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Đang tìm kiếm...</div>}>
      <SearchContent />
    </Suspense>
  );
}
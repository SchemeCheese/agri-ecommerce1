// src/components/home/DailySuggestions.tsx
import React from 'react';
import { Container } from '@/components/ui/Container';
import { ProductCard } from './ProductCard'; // Giữ nguyên nếu ProductCard nằm cùng thư mục hoặc chỉnh lại path nếu cần
import { MOCK_PRODUCTS, MOCK_USER_HISTORY } from '@/data'; // Đã sửa import
import { Sparkles } from 'lucide-react';

export const DailySuggestions = () => {
  // Logic gợi ý: Lọc các sản phẩm có category trùng với lịch sử tìm kiếm
  const suggestedProducts = MOCK_PRODUCTS.filter(p => 
    MOCK_USER_HISTORY.includes(p.category)
  ).slice(0, 8); 

  return (
    <section className="py-16 bg-white">
      <Container>
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Sparkles className="text-yellow-500 w-6 h-6 animate-pulse" />
          <h2 className="text-3xl font-bold text-gray-900">Gợi Ý Hôm Nay</h2>
        </div>

        {suggestedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {suggestedProducts.map((product) => (
               <ProductCard
                  key={product.id}
                  id={product.id}
                  slug={product.slug} 
                  imageUrl={product.images[0]}
                  title={product.name}
                  description={product.description}
                  price={formatCurrency(product.price)} // Lưu ý: Hàm formatCurrency cần import từ utils
                  rawPrice={product.price}
                />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">Chưa có gợi ý phù hợp cho bạn.</p>
        )}
      </Container>
    </section>
  );
};

// Cần import thêm formatCurrency nếu chưa có
import { formatCurrency } from '@/utils/vi';
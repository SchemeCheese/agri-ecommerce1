// src/app/(standard)/cart/page.tsx
import React from 'react';
import { Container } from '@/components/ui/Container';
import { CartItem } from '@/components/cart/CartItem'; 
import { CartSummary } from '@/components/cart/CartSummary'; 

// Dữ liệu mẫu
const cartItems = [
  { id: '1', imageUrl: '/images/nongsan/product-1.jpg', title: 'Dâu tây Đà Lạt', price: 120000, quantity: 2, unit: 'kg' },
  { id: '2', imageUrl: '/images/nongsan/product-3.jpg', title: 'Rau xà lách Hydroponics', price: 50000, quantity: 1, unit: 'kg' },
];

export default function CartPage() {
  return (
    <div className="py-12 bg-gray-50/50">
      <Container>
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Giỏ hàng của bạn
        </h1>
        <div className="flex flex-col lg:flex-row gap-8">
        
          {/* Cột trái: Danh sách sản phẩm */}
          <div className="w-full lg:w-2/3 space-y-4">
            {cartItems.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}
          </div>
          
          {/* Cột phải: Tóm tắt đơn hàng */}
          <aside className="w-full lg:w-1/3">
            <CartSummary />
          </aside>
          
        </div>
      </Container>
    </div>
  );
}
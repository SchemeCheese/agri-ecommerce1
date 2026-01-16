"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { formatCurrency } from '@/utils/vi';
import {
  ShoppingCart, Plus, Minus, Star, Ticket, Truck,
  MapPin, MessageCircle, Store, ChevronRight, ThumbsUp
} from 'lucide-react';
// import { ProductCard } from '@/components/home/ProductCard'; // Nếu cần dùng card chuẩn
import { MOCK_PRODUCTS, Product } from '@/data';
import { ChatWidget } from '@/components/home/ChatWidget';

// --- SUB-COMPONENT: Rating Stars ---
const RatingStars = ({ rating }: { rating: number }) => (
  <div className="flex items-center">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={14}
        className={`${star <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ))}
  </div>
);

// --- SUB-COMPONENT: Shop Info Card ---
const ShopInfoCard = ({ shop }: { shop: Product['shop'] }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row items-center gap-4">
    {/* Avatar & Tên */}
    <div className="flex items-center gap-4 border-r border-gray-100 pr-6 min-w-[300px]">
      <div className="relative w-16 h-16 rounded-full overflow-hidden border">
        <Image src={shop.avatar} alt={shop.name} fill className="object-cover" />
      </div>
      <div>
        <h3 className="font-bold text-gray-900">{shop.name}</h3>
        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
          <MapPin size={12} /> {shop.location}
        </p>
        <div className="flex gap-2 mt-2">
          <button className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200 font-medium">
            <MessageCircle size={12} /> Chat ngay
          </button>
          <button className="flex items-center gap-1 text-xs bg-white text-gray-700 px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">
            <Store size={12} /> Xem Shop
          </button>
        </div>
      </div>
    </div>

    {/* Chỉ số Shop */}
    <div className="grid grid-cols-3 gap-8 text-center flex-1">
      <div>
        <p className="text-gray-500 text-xs">Đánh giá</p>
        <p className="text-green-600 font-bold">{shop.rating} / 5.0</p>
      </div>
      <div>
        <p className="text-gray-500 text-xs">Phản hồi</p>
        <p className="text-gray-900 font-bold">{shop.responseRate}</p>
      </div>
      <div>
        <p className="text-gray-500 text-xs">Tham gia</p>
        <p className="text-gray-900 font-bold">2 năm trước</p>
      </div>
    </div>
  </div>
);

// --- MAIN COMPONENT ---
export default function ProductClient({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const addToCart = useCartStore((state) => state.addToCart);

  // Lọc sản phẩm cùng Shop (Lấy nhiều hơn để hiển thị Grid ngang)
  const shopProducts = MOCK_PRODUCTS.filter(p => p.shop.id === product.shop.id && p.id !== product.id).slice(0, 6);

  // Lọc sản phẩm gợi ý
  const relatedProducts = MOCK_PRODUCTS.filter(p => p.category === product.category && p.id !== product.id).slice(0, 6);

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      images: product.images,
      slug: product.slug,
      category: product.category,
      origin: product.origin,
      seasons: product.seasons,
      description: product.description
    }, quantity);
    alert("Đã thêm vào giỏ hàng!");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 pace-y-8 bg-gray-50 min-h-screen">

      {/* 1. KHỐI THÔNG TIN CHÍNH (ẢNH + GIÁ + MUA) */}
      <div className="bg-white p-6 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Cột Trái: Ảnh */}
        <div className="md:col-span-5 space-y-4">
          <div className="relative aspect-square w-full rounded-lg overflow-hidden border">
            <Image
              src={product.images[activeImage]}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {product.images.map((img, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setActiveImage(idx)}
                className={`relative w-20 h-20 border-2 rounded cursor-pointer ${activeImage === idx ? 'border-green-600' : 'border-transparent'}`}
              >
                <Image src={img} alt="thumb" fill className="object-cover rounded-sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Cột Phải: Info */}
        <div className="md:col-span-7">
          <h1 className="text-2xl font-medium text-gray-900 mb-2">{product.name}</h1>

          <div className="flex items-center gap-4 text-sm mb-4 border-b pb-4 border-gray-100">
            <div className="flex items-center gap-1 text-yellow-500 border-r pr-4 border-gray-300">
              <span className="font-bold underline">{product.rating}</span>
              <RatingStars rating={product.rating} />
            </div>
            <div className="border-r pr-4 border-gray-300">
              <span className="font-bold border-b border-gray-800 border-dotted">{product.reviewCount}</span>
              <span className="text-gray-500 ml-1">Đánh giá</span>
            </div>
            <div>
              <span className="font-bold text-gray-900">{product.sold}</span>
              <span className="text-gray-500 ml-1">Đã bán</span>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex items-end gap-3">
              {product.originalPrice && (
                <span className="text-gray-400 line-through text-lg">{formatCurrency(product.originalPrice)}</span>
              )}
              <span className="text-3xl font-bold text-green-600">{formatCurrency(product.price)}</span>
              {product.originalPrice && (
                <span className="text-xs font-bold bg-red-100 text-red-600 px-1 py-0.5 rounded">
                  GIẢM {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                </span>
              )}
            </div>
          </div>

          {/* Vouchers */}
          {product.vouchers && product.vouchers.length > 0 && (
            <div className="flex items-center gap-4 mb-6">
              <span className="text-gray-500 w-24 text-sm">Mã giảm giá</span>
              <div className="flex gap-2">
                {product.vouchers.map(v => (
                  <span key={v} className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Ticket size={12} /> {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Vận chuyển */}
          <div className="flex items-start gap-4 mb-8">
            <span className="text-gray-500 w-24 text-sm mt-1">Vận chuyển</span>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                <Truck size={18} className="text-green-600" />
                <span>Vận chuyển tới <span className="font-bold">Hà Nội</span></span>
              </div>
              <p className="text-xs text-gray-500 pl-7">Phí vận chuyển: ₫15.000 - ₫30.000 (Dự kiến giao 2-3 ngày)</p>
            </div>
          </div>

          {/* Số lượng & Button */}
          <div className="flex items-center gap-6 mb-8">
            <span className="text-gray-500 w-24 text-sm">Số lượng</span>
            <div className="flex items-center border border-gray-300 rounded">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 hover:bg-gray-100"><Minus size={14} /></button>
              <input type="text" value={quantity} readOnly className="w-12 text-center text-sm font-medium focus:outline-none" />
              <button onClick={() => setQuantity(q => q + 1)} className="p-2 hover:bg-gray-100"><Plus size={14} /></button>
            </div>
            <span className="text-xs text-gray-500">{product.stock} sản phẩm có sẵn</span>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleAddToCart}
              className="flex-1 bg-green-50 border border-green-600 text-green-700 py-3 rounded-md font-bold hover:bg-green-100 transition flex justify-center items-center gap-2"
            >
              <ShoppingCart size={20} /> Thêm vào giỏ hàng
            </button>
            <button className="flex-1 bg-green-600 text-white py-3 rounded-md font-bold hover:bg-green-700 transition">
              Mua ngay
            </button>
          </div>
        </div>
      </div>

      <div className=" py-2 bg-gray-50">  </div>

      {/* 2. THÔNG TIN SHOP */}
      <ShopInfoCard shop={product.shop} />

      {/* 3. CHI TIẾT SẢN PHẨM */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-bold bg-gray-50 p-3 rounded mb-4 text-gray-800 uppercase">Chi tiết sản phẩm</h2>
        <div className="space-y-3 text-sm text-gray-700 px-2">
          <div className="grid grid-cols-[150px_1fr]">
            <span className="text-gray-500">Danh mục</span>
            <span className="text-green-600 font-medium">Agri Connect {'>'} {product.category}</span>
          </div>
          <div className="grid grid-cols-[150px_1fr]">
            <span className="text-gray-500">Thương hiệu</span>
            <span>{product.brand}</span>
          </div>
          <div className="grid grid-cols-[150px_1fr]">
            <span className="text-gray-500">Nguồn gốc</span>
            <span className="capitalize">{product.origin}</span>
          </div>
          <div className="grid grid-cols-[150px_1fr]">
            <span className="text-gray-500">Kho hàng</span>
            <span>{product.stock}</span>
          </div>
          <div className="grid grid-cols-[150px_1fr]">
            <span className="text-gray-500">Gửi từ</span>
            <span>{product.shop.location}</span>
          </div>
          <div className="grid grid-cols-[150px_1fr]">
            <span className="text-gray-500">Mùa vụ</span>
            <span className="capitalize">{product.seasons.join(', ')}</span>
          </div>
        </div>

        <h2 className="text-lg font-bold bg-gray-50 p-3 rounded my-4 text-gray-800 uppercase">Mô tả sản phẩm</h2>
        <div className="text-gray-700 leading-relaxed px-2 whitespace-pre-line">
          {product.description}
        </div>
      </div>

      <div className=" py-2 bg-gray-50">  </div>

      {/* 4. ĐÁNH GIÁ SẢN PHẨM */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-6 uppercase">Đánh giá sản phẩm</h2>

        {(!product.reviews || product.reviews.length === 0) && (
          <p className="text-gray-500 text-center py-4">Chưa có đánh giá nào.</p>
        )}

        <div className="space-y-6">
          {product.reviews?.map((review) => (
            <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold">
                  {review.userName.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{review.userName}</div>
                  <RatingStars rating={review.rating} />
                  <div className="text-xs text-gray-400 mt-1">{review.date} | Phân loại: Hộp 500g</div>
                  <div className="mt-3 text-gray-700 text-sm">{review.comment}</div>
                  {review.images && review.images.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {review.images.map((img, index) => (
                        <Image key={index} src={img} alt={`Review image ${index + 1}`} width={100} height={100} className="rounded" />
                      ))}
                    </div>
                  )}

                  <button className="flex items-center gap-1 text-gray-400 text-xs mt-3 hover:text-green-600">
                    <ThumbsUp size={12} /> Hữu ích?
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className=" py-2 bg-gray-50">  </div>

      {/* 5. CÁC SẢN PHẨM KHÁC CỦA SHOP (ĐÃ CHUYỂN XUỐNG DƯỚI & SỬA THÀNH GRID NGANG) */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 uppercase border-l-4 border-green-600 pl-3">
            Sản phẩm khác của Shop
          </h2>
          <Link href={`/shop/${product.shop.id}`} className="text-green-600 text-sm hover:underline flex items-center gap-1">
            Xem tất cả <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {shopProducts.map(p => (
            <div key={p.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 group">
              <Link href={`/products/${p.slug}`}>
                <div className="relative aspect-square w-full">
                  <Image src={p.images[0]} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-3">
                  <h3 className="text-sm text-gray-800 line-clamp-2 min-h-[40px] mb-2 group-hover:text-green-600 transition-colors">
                    {p.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-green-600 font-bold">{formatCurrency(p.price)}</span>
                    <span className="text-xs text-gray-400">Đã bán {p.sold}</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
          {shopProducts.length === 0 && <p className="col-span-full text-center text-gray-400 py-4">Shop chưa có sản phẩm nào khác.</p>}
        </div>
      </div>

      {/* 6. CÓ THỂ BẠN CŨNG THÍCH */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 uppercase border-l-4 border-green-600 pl-3">Có thể bạn cũng thích</h2>
          <Link href="/products" className="text-green-600 text-sm hover:underline">Xem thêm</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {relatedProducts.map((p) => (
            <div key={p.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 group">
              <Link href={`/products/${p.slug}`}>
                <div className="relative aspect-square w-full">
                  <Image src={p.images[0]} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-3">
                  <h3 className="text-sm text-gray-800 line-clamp-2 min-h-[40px] mb-2 group-hover:text-green-600 transition-colors">
                    {p.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-green-600 font-bold">{formatCurrency(p.price)}</span>
                    <span className="text-xs text-gray-400">Đã bán {p.sold}</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      < ChatWidget />

    </div>
  );
}
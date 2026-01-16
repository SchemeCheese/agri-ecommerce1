"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { ShopInfo, Product } from '@/data';
import { ProductCard } from '@/components/home/ProductCard';
import { formatCurrency } from '@/utils/vi';
import { 
  UserPlus, MessageCircle, Star, MapPin, 
  Store, Clock, Ticket, Filter, LayoutGrid 
} from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface ShopClientProps {
  shop: ShopInfo;
  products: Product[];
}

export default function ShopClient({ shop, products }: ShopClientProps) {
  
  // 1. Logic lọc sản phẩm theo yêu cầu
  
  // Top 6 Đánh giá cao nhất (Sắp xếp theo rating giảm dần)
  const topRatedProducts = useMemo(() => 
    [...products].sort((a, b) => b.rating - a.rating).slice(0, 6)
  , [products]);

  // Top 6 Bán chạy nhất (Sắp xếp theo sold giảm dần)
  const bestSellingProducts = useMemo(() => 
    [...products].sort((a, b) => b.sold - a.sold).slice(0, 6)
  , [products]);

  // Hàng mới (Trong vòng 30 ngày)
  const newArrivals = useMemo(() => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return products.filter(p => new Date(p.createdAt) > oneMonthAgo);
  }, [products]);

  // Danh mục sản phẩm CỦA RIÊNG SHOP (để hiển thị sidebar bên trái)
  const shopCategories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return Array.from(cats);
  }, [products]);

  // State lọc cho phần "Tất cả sản phẩm"
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredAllProducts = activeCategory === 'all' 
    ? products 
    : products.filter(p => p.category === activeCategory);


  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      
      {/* --- PHẦN 1: HEADER SHOP --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Background Cover (Giả lập mờ) */}
        <div className="h-32 bg-gradient-to-r from-green-600 to-teal-500 relative">
           <div className="absolute inset-0 bg-black/10"></div>
        </div>
        
        <div className="px-6 pb-6">
          <div className="flex flex-col md:flex-row items-end md:items-center -mt-10 gap-6">
            
            {/* Avatar & Actions */}
            <div className="flex flex-col items-center">
              <div className="relative w-28 h-28 rounded-full border-4 border-white shadow-md overflow-hidden bg-white">
                <Image src={shop.avatar} alt={shop.name} fill className="object-cover" />
              </div>
              <h1 className="mt-3 text-xl font-bold text-gray-900">{shop.name}</h1>
              <div className="flex gap-2 mt-3">
                <button className="flex items-center gap-1 bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-green-700 transition shadow-sm">
                  <UserPlus size={16} /> Theo dõi
                </button>
                <button className="flex items-center gap-1 bg-white text-green-600 border border-green-600 px-4 py-1.5 rounded-full text-sm font-medium hover:bg-green-50 transition">
                  <MessageCircle size={16} /> Chat
                </button>
              </div>
            </div>

            {/* Shop Stats */}
            <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 md:mt-0 md:ml-8 md:border-l md:pl-8 border-gray-200">
                <StatItem icon={<Store size={18}/>} label="Sản phẩm" value={shop.totalProducts || products.length} />
                <StatItem icon={<UserPlus size={18}/>} label="Người theo dõi" value={shop.followers} />
                <StatItem icon={<Star size={18}/>} label="Đánh giá" value={`${shop.rating} / 5.0`} />
                <StatItem icon={<MessageCircle size={18}/>} label="Phản hồi Chat" value={shop.responseRate} />
                <StatItem icon={<Clock size={18}/>} label="Tham gia" value={shop.joinDate} />
                <StatItem icon={<MapPin size={18}/>} label="Địa chỉ" value={shop.location} isFull />
            </div>
          </div>
        </div>
      </div>

      {/* --- PHẦN 2: VOUCHER SHOP --- */}
      {shop.shopVouchers && shop.shopVouchers.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Ticket className="text-orange-500" /> Mã Giảm Giá Của Shop
          </h3>
          <div className="flex flex-wrap gap-4">
            {shop.shopVouchers.map((code, idx) => (
              <div key={idx} className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-3 w-64 relative overflow-hidden group cursor-pointer hover:shadow-md transition">
                <div className="border-r border-orange-200 pr-3 border-dashed">
                   <span className="font-bold text-orange-600 text-lg">Voucher</span>
                </div>
                <div>
                   <p className="font-bold text-gray-800">{code}</p>
                   <p className="text-xs text-orange-500">HSD: 30/12/2024</p>
                </div>
                {/* Decoration Circles */}
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-white rounded-full border border-orange-200"></div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-white rounded-full border border-orange-200"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PHẦN 3: GỢI Ý CHO BẠN (TOP RATED) --- */}
      <ProductSection title="Gợi ý cho bạn" subtitle="Sản phẩm được đánh giá cao nhất">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {topRatedProducts.map(p => (
             <ProductCard key={p.id} {...mapProductToCard(p)} />
          ))}
        </div>
      </ProductSection>

      {/* --- PHẦN 4: BANNER 1 --- */}
      {shop.banners && shop.banners.length > 0 && (
        <div className="rounded-xl overflow-hidden shadow-sm">
           <ShopBanner images={shop.banners} />
        </div>
      )}

      {/* --- PHẦN 5: SẢN PHẨM BÁN CHẠY --- */}
      <ProductSection title="Sản phẩm bán chạy" subtitle="Top sản phẩm hot nhất tại shop">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {bestSellingProducts.map(p => (
             <ProductCard key={p.id} {...mapProductToCard(p)} />
          ))}
        </div>
      </ProductSection>

      {/* --- PHẦN 6: BANNER 2 --- */}
      {shop.banners2 && shop.banners2.length > 0 && (
        <div className="rounded-xl overflow-hidden shadow-sm">
           <ShopBanner images={shop.banners2} />
        </div>
      )}

      {/* --- PHẦN 7: HÀNG MỚI VỀ (Ẩn nếu không có) --- */}
      {newArrivals.length > 0 && (
        <ProductSection title="Hàng mới về" subtitle="Sản phẩm mới cập nhật tháng này">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {newArrivals.map(p => (
               <ProductCard key={p.id} {...mapProductToCard(p)} />
            ))}
          </div>
        </ProductSection>
      )}

      {/* --- PHẦN 8: TẤT CẢ SẢN PHẨM (LAYOUT 2 CỘT) --- */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        
        {/* Sidebar Danh mục (Bên trái) */}
        <div className="w-full md:w-64 bg-white p-4 rounded-xl shadow-sm border border-gray-100 sticky top-4">
           <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
             <LayoutGrid size={18} /> Danh mục Shop
           </h3>
           <div className="space-y-1">
              <button 
                onClick={() => setActiveCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${activeCategory === 'all' ? 'bg-green-50 text-green-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Tất cả sản phẩm
              </button>
              {shopCategories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm capitalize transition ${activeCategory === cat ? 'bg-green-50 text-green-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {cat.replace('-', ' ')}
                </button>
              ))}
           </div>
        </div>

        {/* Grid Sản phẩm (Bên phải) */}
        <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-800 text-lg">Danh sách sản phẩm</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                 <Filter size={16} /> 
                 <span>Sắp xếp: Mặc định</span>
              </div>
           </div>
           
           {filteredAllProducts.length > 0 ? (
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredAllProducts.map(p => (
                   <ProductCard key={p.id} {...mapProductToCard(p)} />
                ))}
             </div>
           ) : (
             <div className="text-center py-20 text-gray-500">
               Không có sản phẩm nào trong danh mục này.
             </div>
           )}
        </div>

      </div>

    </div>
  );
}

// --- HELPER COMPONENTS ---

// 1. Hiển thị 1 chỉ số thống kê (Stat)
const StatItem = ({ icon, label, value, isFull = false }: any) => (
  <div className={`flex items-center gap-3 ${isFull ? 'col-span-2' : ''}`}>
    <div className="text-gray-400">{icon}</div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-bold text-green-700 truncate">{value}</p>
    </div>
  </div>
);

// 2. Khung Section có Title
const ProductSection = ({ title, subtitle, children }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <div className="mb-6 border-l-4 border-green-600 pl-3">
      <h2 className="text-xl font-bold text-gray-800 uppercase">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
    {children}
  </div>
);

// 3. Carousel Banner Shop
const ShopBanner = ({ images }: { images: string[] }) => (
  <Carousel className="w-full" opts={{ loop: true }}>
    <CarouselContent>
      {images.map((img, idx) => (
        <CarouselItem key={idx}>
          <div className="relative w-full h-[200px] md:h-[350px]">
            <Image src={img} alt="Shop Banner" fill className="object-cover" priority={idx === 0} />
          </div>
        </CarouselItem>
      ))}
    </CarouselContent>
    <CarouselPrevious className="left-4 bg-white/50 hover:bg-white text-gray-800 border-none" />
    <CarouselNext className="right-4 bg-white/50 hover:bg-white text-gray-800 border-none" />
  </Carousel>
);

// 4. Helper map data để dùng lại component ProductCard cũ
const mapProductToCard = (p: Product) => ({
  id: p.id,
  imageUrl: p.images[0],
  title: p.name,
  description: p.description,
  price: formatCurrency(p.price),
  rawPrice: p.price,
  slug: p.slug
});
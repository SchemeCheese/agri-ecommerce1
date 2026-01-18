"use client";

import React, { useState } from 'react';
import { MOCK_PRODUCTS } from '@/data';
import { Star, MessageCircle, BarChart3, Filter } from 'lucide-react';
import { ReviewCard } from '@/components/seller/reviews/ReviewCard';

const CURRENT_SHOP_ID = 'shop-1';

export default function ReviewsManagementPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'unreplied'>('all');
  const [filterStar, setFilterStar] = useState(0);

  // 1. Gom dữ liệu
  const shopReviews = MOCK_PRODUCTS
    .filter(p => p.shop.id === CURRENT_SHOP_ID)
    .flatMap(p => (p.reviews || []).map(r => ({ ...r, productName: p.name, productImage: p.images[0] })));

  // 2. Logic Lọc
  const filteredReviews = shopReviews.filter(r => {
    const matchStar = filterStar === 0 || Math.round(r.rating) === filterStar;
    // const matchReply = activeTab === 'all' || (activeTab === 'unreplied' && !r.isReplied); // Cần thêm field isReplied vào data thật
    return matchStar;
  });

  // Stats
  const averageRating = shopReviews.length > 0 
    ? (shopReviews.reduce((acc, r) => acc + r.rating, 0) / shopReviews.length).toFixed(1) 
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. SECTION THỐNG KÊ (Giữ nguyên vì bạn khen đẹp) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-500 shadow-sm">
               <Star size={28} fill="currentColor" />
            </div>
            <div>
               <h3 className="text-3xl font-extrabold text-gray-900">{averageRating}</h3>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Điểm trung bình</p>
            </div>
         </div>

         <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shadow-sm">
               <MessageCircle size={28} />
            </div>
            <div>
               <h3 className="text-3xl font-extrabold text-gray-900">{shopReviews.length}</h3>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Tổng đánh giá</p>
            </div>
         </div>

         <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 shadow-sm">
               <BarChart3 size={28} />
            </div>
            <div>
               <h3 className="text-3xl font-extrabold text-gray-900">98%</h3>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Tỉ lệ phản hồi</p>
            </div>
         </div>
      </div>

      {/* 2. SECTION DANH SÁCH */}
      <div className="space-y-5">
        
        {/* Toolbar Lọc */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
           {/* Tabs Trái */}
           <div className="flex bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Tất cả
              </button>
              <button 
                onClick={() => setActiveTab('unreplied')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'unreplied' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Chưa trả lời (2)
              </button>
           </div>

           {/* Filter Sao Phải */}
           <div className="flex items-center gap-2 px-2 overflow-x-auto w-full md:w-auto">
              <span className="text-xs font-bold text-gray-400 uppercase mr-2 flex items-center gap-1"><Filter size={12}/> Lọc sao:</span>
              {[0, 5, 4, 3, 2, 1].map(star => (
                <button
                  key={star}
                  onClick={() => setFilterStar(star)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1 ${
                    filterStar === star 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {star === 0 ? 'All' : <>{star} <Star size={10} fill="currentColor"/></>}
                </button>
              ))}
           </div>
        </div>

        {/* List Card */}
        <div className="space-y-4">
          {filteredReviews.length > 0 ? (
            filteredReviews.map((review, idx) => (
              <ReviewCard 
                key={`${review.id}-${idx}`} 
                review={review} 
                onReply={(id) => alert(`Mở khung chat trả lời cho review ${id}`)} 
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                 <MessageCircle size={32} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Không tìm thấy đánh giá</h3>
              <p className="text-gray-500 text-sm mt-1">Thử thay đổi bộ lọc hoặc chọn tab khác.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
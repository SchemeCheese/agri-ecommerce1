"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { TOP_SHOPS } from '@/data';
import { 
  Camera, Save, Plus, X, Ticket, MapPin, 
  Store, ImageIcon, Globe, Star 
} from 'lucide-react';

export default function ShopProfilePage() {
  // Giả lập lấy dữ liệu shop hiện tại
  const [shopInfo, setShopInfo] = useState(TOP_SHOPS[0]);
  const [isSaving, setIsSaving] = useState(false);

  // Xử lý upload banner giả
  const handleBannerUpload = (e: any, field: 'banners' | 'banners2') => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setShopInfo({ ...shopInfo, [field]: [...(shopInfo[field] || []), url] });
    }
  };

  const handleAvatarUpload = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setShopInfo({ ...shopInfo, avatar: url });
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('Đã cập nhật hồ sơ Shop thành công!');
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. HEADER: Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hồ sơ Shop</h1>
          <p className="text-gray-500 mt-2 font-medium">Thiết lập thông tin hiển thị và trang trí gian hàng của bạn.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all active:scale-95 disabled:opacity-70"
        >
          <Save size={20} /> {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* === CỘT TRÁI: ĐỊNH DANH & THÔNG TIN CƠ BẢN === */}
        <div className="xl:col-span-1 space-y-8">
          
          {/* Box 1: Avatar & Tên Shop */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-green-50 to-emerald-100 z-0"></div>
            
            {/* Avatar Uploader */}
            <div className="relative z-10 mb-6 group">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-white relative">
                <Image src={shopInfo.avatar} alt="avatar" fill className="object-cover" />
                {/* Overlay Hover */}
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-[1px]">
                   <Camera className="text-white mb-1" size={24} />
                   <span className="text-[10px] text-white font-bold uppercase">Đổi ảnh</span>
                </div>
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarUpload} accept="image/*"/>
              </div>
              <div className="absolute bottom-1 right-1 bg-green-500 border-2 border-white rounded-full p-1.5 text-white shadow-sm">
                <Store size={14} />
              </div>
            </div>

            {/* Stats Read-only */}
            <div className="flex items-center gap-4 mb-6 z-10">
               <div className="px-3 py-1 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-1.5">
                  <Star size={14} className="text-yellow-500 fill-yellow-500"/>
                  <span className="text-sm font-bold text-gray-700">{shopInfo.rating}</span>
               </div>
               <div className="px-3 py-1 bg-gray-50 rounded-lg border border-gray-100 text-sm font-bold text-gray-700">
                  {shopInfo.followers >= 1000 ? `${(shopInfo.followers/1000).toFixed(1)}k` : shopInfo.followers} <span className="text-gray-400 font-normal">Followers</span>
               </div>
            </div>

            {/* Inputs */}
            <div className="w-full space-y-5 z-10 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Tên gian hàng</label>
                <input 
                  type="text" 
                  value={shopInfo.name} 
                  onChange={(e) => setShopInfo({...shopInfo, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none font-bold text-gray-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Địa chỉ kho hàng</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-3.5 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    value={shopInfo.location}
                    onChange={(e) => setShopInfo({...shopInfo, location: e.target.value})} 
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none font-medium transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Box 2: Giới thiệu */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <Globe size={20} className="text-blue-500"/> Giới thiệu Shop
            </h3>
            <textarea 
              rows={4}
              value={shopInfo.highlight}
              onChange={(e) => setShopInfo({...shopInfo, highlight: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none text-gray-600 leading-relaxed transition-all"
              placeholder="VD: Chuyên cung cấp nông sản sạch Đà Lạt, cam kết VietGAP..."
            ></textarea>
          </div>
        </div>

        {/* === CỘT PHẢI: TRANG TRÍ & MARKETING === */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Box 3: Banner Chính */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <ImageIcon size={20} className="text-purple-500"/> 
                Banner Trang Chủ
                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Tối đa 5 ảnh</span>
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shopInfo.banners?.map((banner, idx) => (
                <div key={idx} className="relative aspect-[3/1] rounded-xl overflow-hidden border border-gray-200 group shadow-sm">
                  <Image src={banner} alt="banner" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                    <button 
                      onClick={() => setShopInfo({...shopInfo, banners: shopInfo.banners.filter((_, i) => i !== idx)})}
                      className="bg-white text-red-500 p-2 rounded-full shadow-lg hover:scale-110 transition"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
              
              <label className="aspect-[3/1] rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50/50 transition-all group">
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2 group-hover:bg-white group-hover:shadow-sm transition">
                   <Plus className="text-gray-400 group-hover:text-green-600" />
                </div>
                <span className="text-xs font-bold text-gray-500 group-hover:text-green-700">Thêm Banner</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleBannerUpload(e, 'banners')} />
              </label>
            </div>
          </div>

           {/* Box 4: Banner Phụ */}
           <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
              <ImageIcon size={20} className="text-indigo-500"/> 
              Banner Phụ
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {shopInfo.banners2?.map((banner, idx) => (
                <div key={idx} className="relative aspect-[2/1] rounded-xl overflow-hidden border border-gray-200 group shadow-sm">
                  <Image src={banner} alt="banner" fill className="object-cover" />
                  <button 
                    onClick={() => setShopInfo({...shopInfo, banners2: shopInfo.banners2.filter((_, i) => i !== idx)})}
                    className="absolute top-2 right-2 bg-white text-red-500 p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 hover:scale-110 transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <label className="aspect-[2/1] rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all">
                <Plus className="text-gray-400 hover:text-indigo-600" />
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleBannerUpload(e, 'banners2')} />
              </label>
            </div>
          </div>

          {/* Box 5: Vouchers */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                 <Ticket size={20} className="text-orange-500"/> Mã giảm giá
              </h3>
              <button className="text-sm text-green-600 font-bold hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors">
                 + Tạo mã mới
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shopInfo.shopVouchers?.map((voucher, idx) => (
                <div key={idx} className="relative flex items-center justify-between p-4 border border-orange-100 bg-gradient-to-r from-orange-50 to-white rounded-xl shadow-sm group hover:border-orange-300 transition-colors">
                  {/* Decorative dots for ticket look */}
                  <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-orange-100 rounded-full"></div>
                  <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-orange-100 rounded-full"></div>

                  <div className="flex items-center gap-4 ml-2">
                    <div className="w-10 h-10 bg-white rounded-lg border border-orange-100 flex items-center justify-center text-orange-500 shadow-sm">
                      <Ticket size={20} />
                    </div>
                    <div>
                      <p className="font-black text-gray-800 text-lg leading-none">{voucher}</p>
                      <p className="text-[10px] text-orange-600 font-bold uppercase mt-1 tracking-wide">Đang hoạt động</p>
                    </div>
                  </div>
                  <button className="text-gray-300 hover:text-red-500 transition-colors mr-2">
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
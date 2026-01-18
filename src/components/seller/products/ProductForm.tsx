"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Product } from '@/data';
import { Upload, X, Save, Sparkles, ChevronRight } from 'lucide-react';

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: any) => void;
}

export const ProductForm = ({ initialData, onSubmit }: ProductFormProps) => {
  const [formData, setFormData] = useState<Partial<Product>>(initialData || {
        name: '',
        price: 0,
        originalPrice: 0,
        stock: 100,
        description: '',
        images: [],
        category: 'trai-cay',
        origin: 'da-lat',
        vouchers: [],
        shop: { // Mock shop info cho lúc tạo mới
            id: 'shop-1', name: 'Shop Của Tôi', location: 'Kho HN',
            avatar: '', rating: 5, responseRate: '100%', followers: 0, following: 0,
            joinDate: 'Now', totalProducts: 0, banners: [], banners2: [], shopVouchers: [], highlight: ''
        }
    });
  const [images, setImages] = useState<string[]>(initialData?.images || []);

  const handleChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: any) => {
    if (e.target.files?.[0]) {
      setImages([...images, URL.createObjectURL(e.target.files[0])]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* LEFT COLUMN: Main Info */}
      <div className="lg:col-span-2 space-y-8">
        {/* Box 1: Basic Info */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
           <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
             <div className="w-1 h-6 bg-green-500 rounded-full"></div>
             Thông tin cơ bản
           </h3>
           
           <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tên sản phẩm</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium text-lg"
                placeholder="VD: Dâu tây Đà Lạt loại 1..."
              />
           </div>

           <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả chi tiết</label>
              <textarea 
                rows={6}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                placeholder="Mô tả về hương vị, xuất xứ, cách bảo quản..."
              ></textarea>
           </div>
        </div>

        {/* Box 2: Price & Inventory (AI Pricing Here) */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
           <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                Giá bán & Kho hàng
              </h3>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors">
                 <Sparkles size={14} /> AI Gợi ý giá
              </button>
           </div>

           <div className="grid grid-cols-2 gap-6">
              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">Giá bán (₫)</label>
                 <input 
                   type="number" 
                   value={formData.price}
                   onChange={(e) => handleChange('price', Number(e.target.value))}
                   className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none text-xl font-bold text-green-600"
                 />
              </div>
              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">Tồn kho</label>
                 <input 
                   type="number" 
                   value={formData.stock}
                   onChange={(e) => handleChange('stock', Number(e.target.value))}
                   className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none font-bold"
                 />
              </div>
           </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Images & Category */}
      <div className="space-y-8">
         {/* Box 3: Images */}
         <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Hình ảnh</h3>
            <div className="grid grid-cols-2 gap-3">
               {images.map((img, idx) => (
                 <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group">
                    <Image src={img} alt="preview" fill className="object-cover" />
                    <button onClick={() => setImages(images.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition"><X size={14}/></button>
                 </div>
               ))}
               <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 text-gray-400 hover:text-green-600 transition-all">
                  <Upload size={24} />
                  <span className="text-xs font-bold mt-2">Tải ảnh lên</span>
                  <input type="file" className="hidden" onChange={handleImageUpload} />
               </label>
            </div>
         </div>

         {/* Box 4: Category */}
         <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Phân loại</h3>
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Danh mục</label>
                  <div className="relative">
                     <select 
                       value={formData.category}
                       onChange={(e) => handleChange('category', e.target.value)}
                       className="w-full appearance-none px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-green-500 outline-none"
                     >
                       <option value="trai-cay">Trái cây</option>
                       <option value="rau-cu">Rau củ</option>
                     </select>
                     <ChevronRight className="absolute right-4 top-3.5 text-gray-400 rotate-90" size={16} />
                  </div>
               </div>
            </div>
         </div>

         {/* Submit Button */}
         <button 
           onClick={() => onSubmit({ ...formData, images })}
           className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-600/30 hover:bg-green-700 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2"
         >
           <Save size={20} /> Lưu Sản Phẩm
         </button>
      </div>

    </div>
  );
};
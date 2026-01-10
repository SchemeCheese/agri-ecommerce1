'use client';

import React, { useState } from 'react';
import { Container } from '@/components/ui/Container';

export default function CreateProductPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [productName, setProductName] = useState('');
  const [priceSuggestion, setPriceSuggestion] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setIsAnalyzing(true);
      setPriceSuggestion(null);

      setTimeout(() => {
        setIsAnalyzing(false);
        setProductName('Cà chua bi Organic'); 
        setPriceSuggestion('Thị trường: 40.000đ - 60.000đ / kg. Gợi ý: 55.000đ'); 
      }, 2000);
    }
  };

  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <Container>
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm">
          <h1 className="text-2xl font-bold text-green-800 mb-6">Đăng bán sản phẩm mới</h1>
          
          <div className="space-y-6">
            {/* Upload Ảnh */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh sản phẩm (AI sẽ hỗ trợ nhận diện)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                <input type="file" onChange={handleImageUpload} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="cursor-pointer">
                    {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="h-48 mx-auto object-contain rounded-md" />
                    ) : (
                        <div className="text-gray-500">
                            <p>Kéo thả hoặc bấm để tải ảnh lên</p>
                        </div>
                    )}
                </label>
              </div>
            </div>

            {isAnalyzing && (
              <div className="flex items-center space-x-2 text-blue-600 bg-blue-50 p-3 rounded-md animate-pulse">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span className="text-sm font-medium">AI đang phân tích hình ảnh để gợi ý tên & giá...</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm</label>
              <input 
                type="text" 
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                placeholder="Nhập tên sản phẩm..."
              />
              {priceSuggestion && (
                  <div className="mt-2 p-3 bg-green-50 text-green-800 text-sm rounded-md border border-green-200 flex items-start">
                      <span className="mr-2">💡</span>
                      <div>
                          <span className="font-semibold">Gợi ý từ AI:</span> {priceSuggestion}
                      </div>
                  </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giá bán (VNĐ)</label>
              <input 
                type="number" 
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="0"
              />
            </div>

            <button className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-transform active:scale-95">
              Đăng bán ngay
            </button>
          </div>
        </div>
      </Container>
    </div>
  );
}
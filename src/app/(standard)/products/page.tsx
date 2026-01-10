"use client";

import React, { useState, useMemo } from 'react';
import { MOCK_PRODUCTS } from '@/data/mockData';
import { ProductCard } from '@/components/home/ProductCard';
import { formatCurrency } from '@/utils/vi';
import { Slider } from "@/components/ui/slider";

const CATEGORIES = [
  { id: 'all', name: 'Tất cả' },
  { id: 'trai-cay', name: 'Trái cây' },
  { id: 'rau-cu', name: 'Rau củ' },
  { id: 'ngu-coc', name: 'Ngũ cốc' },
  { id: 'gia-vi', name: 'Gia vị' },
  { id: 'khac', name: 'Khác' },
];

const ORIGINS = [
  { id: 'da-lat', name: 'Đà Lạt' },
  { id: 'tay-bac', name: 'Tây Bắc' },
  { id: 'mien-tay', name: 'Miền Tây' },
  { id: 'nhap-khau', name: 'Nhập khẩu' },
];

const SEASONS = [
  { id: 'xuan', name: 'Mùa Xuân' },
  { id: 'ha', name: 'Mùa Hạ' },
  { id: 'thu', name: 'Mùa Thu' },
  { id: 'dong', name: 'Mùa Đông' },
  { id: 'quanh-nam', name: 'Quanh năm' },
];

const MAX_PRICE = 2000000;

export default function ProductListingPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);

  const [priceRange, setPriceRange] = useState([0, MAX_PRICE]);

  const [sortOption, setSortOption] = useState('default');

  const toggleFilter = (item: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedOrigins([]);
    setSelectedSeasons([]);
    setPriceRange([0, MAX_PRICE]); 
  };

  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => {
      if (selectedCategory !== 'all' && product.category !== selectedCategory) return false;

      if (selectedOrigins.length > 0 && !selectedOrigins.includes(product.origin)) return false;

      if (selectedSeasons.length > 0) {
        const hasMatchingSeason = product.seasons.some(season => selectedSeasons.includes(season));
        if (!hasMatchingSeason) return false;
      }

      if (product.price < priceRange[0] || product.price > priceRange[1]) return false;

      return true;
    }).sort((a, b) => {
      if (sortOption === 'price_asc') return a.price - b.price;
      if (sortOption === 'price_desc') return b.price - a.price;
      return 0;
    });
  }, [selectedCategory, selectedOrigins, selectedSeasons, priceRange, sortOption]);

  return (
    <div className="container mx-auto px-4 py-10 bg-gray-50 min-h-screen font-sans">

      <div className="flex flex-col lg:flex-row gap-8">

        <div className="w-full lg:w-1/4 space-y-8">

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 flex justify-between items-center">
              Danh mục
              {selectedCategory !== 'all' && (
                <span onClick={() => setSelectedCategory('all')} className="text-xs text-green-600 cursor-pointer hover:underline font-normal">Xóa</span>
              )}
            </h3>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${selectedCategory === cat.id
                      ? 'bg-green-50 text-green-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Bộ lọc</h3>
              <button onClick={clearFilters} className="text-xs text-red-500 hover:underline">Xóa tất cả</button>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700">Khoảng giá</label>
                <span className="text-xs font-bold text-green-600">
                  {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}
                </span>
              </div>

              <Slider
                defaultValue={[0, MAX_PRICE]} 
                max={MAX_PRICE}               
                step={10000}                  
                minStepsBetweenThumbs={1}     
                value={priceRange}             
                onValueChange={(val) => setPriceRange(val)} 
                className="my-4"
              />
            </div>

            <hr className="border-gray-100" />

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Nguồn gốc</h4>
              <div className="space-y-2">
                {ORIGINS.map((origin) => (
                  <label key={origin.id} className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedOrigins.includes(origin.id)}
                      onChange={() => toggleFilter(origin.id, selectedOrigins, setSelectedOrigins)}
                      className="rounded text-green-600 focus:ring-green-500 border-gray-300 w-4 h-4"
                    />
                    <span className="text-sm text-gray-600 group-hover:text-green-700">{origin.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <hr className="border-gray-100" />

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Mùa vụ</h4>
              <div className="grid grid-cols-2 gap-2">
                {SEASONS.map((season) => (
                  <label key={season.id} className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedSeasons.includes(season.id)}
                      onChange={() => toggleFilter(season.id, selectedSeasons, setSelectedSeasons)}
                      className="rounded text-green-600 focus:ring-green-500 border-gray-300 w-4 h-4"
                    />
                    <span className="text-sm text-gray-600 group-hover:text-green-700">{season.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-3/4">

          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="text-gray-600 font-medium mb-4 sm:mb-0">
              Tìm thấy <span className="text-green-600 font-bold">{filteredProducts.length}</span> sản phẩm
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">Sắp xếp:</span>
              <select
                className="border border-gray-300 rounded-md py-1.5 px-3 text-sm focus:ring-green-500 focus:border-green-500 outline-none bg-white"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="default">Mới nhất</option>
                <option value="price_asc">Giá: Thấp đến Cao</option>
                <option value="price_desc">Giá: Cao đến Thấp</option>
              </select>
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  slug={product.slug}
                  imageUrl={product.images[0]}
                  title={product.name}
                  description={product.description}
                  price={formatCurrency(product.price)}
                  rawPrice={product.price}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
              <div className="text-4xl mb-4">🍂</div>
              <h3 className="text-lg font-medium text-gray-900">Không tìm thấy sản phẩm</h3>
              <p className="text-gray-500 mt-1">Vui lòng thử điều chỉnh bộ lọc.</p>
              <button
                onClick={clearFilters}
                className="mt-4 text-green-600 hover:text-green-700 font-medium hover:underline"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
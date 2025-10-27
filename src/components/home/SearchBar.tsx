// src/components/home/SearchBar.tsx
'use client'; 
import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

export const SearchBar = () => {
  const { t } = useTranslation();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    origin: '',
    season: '',
    minPrice: '',
    maxPrice: '',
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleApplyFilters = () => {
    console.log("Applying filters:", filters);
    setIsFilterOpen(false); // Đóng popover khi áp dụng
  };

  return (
    <div className="bg-white rounded-full shadow-lg p-2 flex items-center space-x-2 w-full max-w-3xl mx-auto">
      {/* Product Search Input */}
      <div className="flex-grow flex items-center pl-3">
        <Search size={20} className="text-gray-400 mr-2 flex-shrink-0" />
        <input
          type="text"
          placeholder={t('product_placeholder')}
          className="w-full text-sm focus:outline-none placeholder-gray-500 bg-transparent"
        />
      </div>

      {/* Filter Button (Popover) */}
      <div className="relative">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="flex items-center space-x-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors focus:outline-none"
        >
          <Filter size={16} />
          <span>{t('filters')}</span>
        </button>

        {/* Filter Popover Content */}
        {isFilterOpen && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl p-4 z-20 border border-gray-200">
            <h4 className="text-sm font-semibold mb-3">{t('filters')}</h4>
            <div className="space-y-3 text-sm">
              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('category')}</label>
                <select name="category" value={filters.category} onChange={handleFilterChange} className="w-full p-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500">
                  <option value="">{t('all_categories')}</option>
                  <option value="fruits">Trái cây</option>
                  <option value="vegetables">Rau củ</option>
                  <option value="grains">Ngũ cốc</option>
                </select>
              </div>
              {/* Origin */}
               <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('origin')}</label>
                <select name="origin" value={filters.origin} onChange={handleFilterChange} className="w-full p-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500">
                  <option value="">{t('all_origins')}</option>
                  <option value="dalat">Đà Lạt</option>
                  <option value="mekong">Đồng Bằng SCL</option>
                  <option value="north">Miền Bắc</option>
                </select>
              </div>
               {/* Season */}
               <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('season')}</label>
                <select name="season" value={filters.season} onChange={handleFilterChange} className="w-full p-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500">
                  <option value="">{t('all_seasons')}</option>
                  <option value="spring">Xuân</option>
                  <option value="summer">Hạ</option>
                  <option value="autumn">Thu</option>
                  <option value="winter">Đông</option>
                </select>
              </div>
              {/* Price Range */}
              <div className="space-y-1">
                 <label className="block text-xs font-medium text-gray-600">{t('price_range')}</label>
                 <div className="flex space-x-2">
                     <input type="number" name="minPrice" placeholder={t('min_price')} value={filters.minPrice} onChange={handleFilterChange} className="w-1/2 p-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
                     <input type="number" name="maxPrice" placeholder={t('max_price')} value={filters.maxPrice} onChange={handleFilterChange} className="w-1/2 p-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
                 </div>
              </div>
            </div>
            <button
              onClick={handleApplyFilters}
              className="mt-4 w-full bg-green-600 text-white py-1.5 rounded-md text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              {t('apply_filters')}
            </button>
          </div>
        )}
      </div>

      {/* Search Button */}
      <button className="bg-green-600 text-white rounded-full p-2.5 hover:bg-green-700 transition-colors focus:outline-none flex-shrink-0">
        <Search size={20} />
      </button>
    </div>
  );
};
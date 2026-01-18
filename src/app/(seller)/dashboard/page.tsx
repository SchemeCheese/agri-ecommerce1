// src/app/(seller)/dashboard/page.tsx
"use client";

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { REVENUE_DATA, BEST_SELLING_PRODUCTS, LOW_PERFORMING_PRODUCTS } from '@/data/seller';
import { formatCurrency } from '@/utils/vi';
import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart } from 'lucide-react';
import Image from 'next/image';

export default function SellerDashboard() {
  // Tính tổng doanh thu năm
  const totalRevenue = REVENUE_DATA.reduce((acc, curr) => acc + curr.revenue, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tổng quan kinh doanh</h2>
        <p className="text-gray-500">Chào mừng trở lại! Đây là tình hình kinh doanh hôm nay.</p>
      </div>

      {/* 1. Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Tổng Doanh Thu Năm" 
          value={formatCurrency(totalRevenue)} 
          trend="+12.5%" 
          icon={<DollarSign className="text-white" />}
          color="bg-green-500"
        />
        <StatCard 
          title="Đơn Hàng Mới" 
          value="1,240" 
          trend="+5.2%" 
          icon={<ShoppingCart className="text-white" />}
          color="bg-blue-500"
        />
        <StatCard 
          title="Sản Phẩm Tồn Kho" 
          value="450" 
          trend="-2.1%" 
          icon={<Package className="text-white" />}
          color="bg-orange-500"
          isNegative
        />
      </div>

      {/* 2. Biểu đồ Doanh thu (Recharts) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-6">Biểu đồ doanh thu (2024)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={REVENUE_DATA}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(value) => `${value / 1000000}M`} 
              />
              <Tooltip 
                formatter={(value?: number) => formatCurrency(value ?? 0)}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#16a34a" fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Top Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bán chạy nhất */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="text-green-500" /> Sản phẩm bán chạy nhất
          </h3>
          <div className="space-y-4">
            {BEST_SELLING_PRODUCTS.map((p, idx) => (
              <ProductRow key={p.id} product={p} rank={idx + 1} />
            ))}
          </div>
        </div>

        {/* Doanh thu kém nhất */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingDown className="text-red-500" /> Cần cải thiện (Doanh thu thấp)
          </h3>
          <div className="space-y-4">
            {LOW_PERFORMING_PRODUCTS.map((p, idx) => (
              <ProductRow key={p.id} product={p} rank={idx + 1} isLow />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components
const StatCard = ({ title, value, trend, icon, color, isNegative }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      <span className={`text-xs font-medium px-2 py-1 rounded-full mt-2 inline-block ${isNegative ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
        {trend} so với tháng trước
      </span>
    </div>
    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color} shadow-lg shadow-${color}/30`}>
      {icon}
    </div>
  </div>
);

const ProductRow = ({ product, rank, isLow }: any) => (
  <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-50">
    <span className={`font-bold w-6 text-center ${rank === 1 ? 'text-yellow-500 text-xl' : 'text-gray-400'}`}>
      {rank}
    </span>
    <div className="relative w-12 h-12 rounded-md overflow-hidden bg-gray-100">
      <Image src={product.image} alt={product.name} fill className="object-cover" />
    </div>
    <div className="flex-1">
      <h4 className="font-medium text-sm text-gray-900">{product.name}</h4>
      <p className="text-xs text-gray-500">Kho: {product.stock}</p>
    </div>
    <div className="text-right">
      <p className={`font-bold text-sm ${isLow ? 'text-red-600' : 'text-green-600'}`}>
        {formatCurrency(product.revenue)}
      </p>
      <p className="text-xs text-gray-400">{product.sold} đã bán</p>
    </div>
  </div>
);
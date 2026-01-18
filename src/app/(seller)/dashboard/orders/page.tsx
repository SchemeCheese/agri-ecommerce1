// src/app/(seller)/dashboard/orders/page.tsx
"use client";

import React, { useState } from 'react';
import { MOCK_ORDERS } from '@/data/orders';
import { OrderFilter } from '@/components/seller/orders/OrderFilter';
import { OrderTable } from '@/components/seller/orders/OrderTable';
import { Search, Download } from 'lucide-react';

export default function OrderManagementPage() {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Logic lọc dữ liệu
  const filteredOrders = MOCK_ORDERS.filter((order) => {
    const matchStatus = filter === 'all' || order.status === filter;
    const matchSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      order.customer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. Header & Toolbar */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Đơn hàng</h1>
          <p className="text-gray-500 mt-1">Quản lý và xử lý đơn hàng của bạn.</p>
        </div>
        
        <div className="flex gap-3">
           <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Tìm mã đơn, tên khách..." 
                className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none w-64 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 shadow-sm">
              <Download size={20} /> Xuất Excel
           </button>
        </div>
      </div>

      {/* 2. Filter Tabs (Component riêng) */}
      <OrderFilter currentFilter={filter} onFilterChange={setFilter} />

      {/* 3. Table (Component riêng) */}
      <OrderTable orders={filteredOrders} />
      
    </div>
  );
}
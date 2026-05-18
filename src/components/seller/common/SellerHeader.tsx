"use client";

import React, { useEffect, useState } from 'react';
import { Bell, Search, LogOut } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { UserAvatar } from './UserAvatar';

export const SellerHeader = () => {
  const [storeName, setStoreName] = useState('');
  const { user, logout } = useAuth();

  useEffect(() => {
    api.get('/profile/me')
      .then(res => {
        const name = res.data?.profile?.store_name || res.data?.full_name || 'Shop của bạn';
        setStoreName(name);
      })
      .catch(() => setStoreName('Shop của bạn'));
  }, []);

  const handleLogout = () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi Kênh Người Bán?')) {
      logout();
    }
  };

  return (
    <header className="h-20 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 bg-gray-50/80 backdrop-blur-xl border-b border-gray-200/50">
      {/* Greeting / context — truncates on mobile so the right-side actions never wrap */}
      <div className="min-w-0 flex-1 pr-3">
        <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">
          Xin chào, {storeName || '...'} 👋
        </h2>
        <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Quản lý gian hàng của bạn</p>
      </div>

      {/* Right-side actions */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {/* Search — desktop only to preserve mobile space */}
        <div className="hidden xl:flex items-center bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 w-56 focus-within:ring-2 focus-within:ring-green-500/20 transition-all">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="bg-transparent border-none outline-none text-sm ml-2 w-full"
          />
        </div>

        {/* Notifications */}
        <button
          type="button"
          className="relative p-2.5 bg-white rounded-full text-gray-400 hover:text-green-600 hover:bg-green-50 shadow-sm border border-gray-100 transition-all"
          aria-label="Thông báo"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

        {/* Identity chip — avatar + name + role */}
        <div className="flex items-center gap-2 pl-1 pr-2 md:pr-3 py-1 bg-white rounded-full border border-gray-100 shadow-sm">
          <UserAvatar user={user} size={36} />
          <div className="hidden md:flex flex-col leading-tight">
            <span className="text-sm font-semibold text-gray-800 truncate max-w-[140px]">
              {user?.full_name || 'Người dùng'}
            </span>
            <span className="text-[10px] text-green-600 uppercase tracking-wider font-bold">
              Seller
            </span>
          </div>
        </div>

        {/* Logout — top-right corner */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white hover:bg-red-50 text-gray-700 hover:text-red-600 rounded-full border border-gray-100 shadow-sm hover:shadow-md transition-all font-semibold text-sm group"
          aria-label="Đăng xuất"
          title="Đăng xuất"
        >
          <LogOut size={16} className="group-hover:scale-110 transition-transform" />
          <span className="hidden md:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
};

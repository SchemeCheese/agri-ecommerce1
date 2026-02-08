"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { User as UserIcon, Package, MapPin, Phone, LogOut, Settings, LayoutDashboard } from 'lucide-react'; // Rename User icon to avoid conflict
import { formatCurrency } from '@/utils/vi'; 

const MOCK_ORDERS = [
  {
    id: 'ORD-9921',
    date: '10/01/2026',
    status: 'shipping', 
    total: 450000,
    items: ['Dâu tây Đà Lạt (x2)', 'Bơ sáp 034 (x1)']
  },
  {
    id: 'ORD-8812',
    date: '05/01/2026',
    status: 'completed',
    total: 120000,
    items: ['Rau xà lách thủy canh (x3)']
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* LEFT SIDEBAR */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center md:items-start">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-6 w-full">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl font-bold relative overflow-hidden">
                  {/* FIX 1: Dùng user.full_name và user.avatar */}
                  {user.avatar ? (
                    <Image src={user.avatar} alt={user.full_name} fill className="object-cover" />
                  ) : (
                    (user.full_name?.charAt(0).toUpperCase() || 'U')
                  )}
                </div>
                <div className="text-center md:text-left mt-4 md:mt-0">
                  {/* FIX 2: Sửa user.name -> user.full_name */}
                  <h2 className="text-xl font-bold text-gray-800">{user.full_name}</h2>
                  <p className="text-gray-500 text-sm">{user.email}</p>
                  <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {/* FIX 3: Sửa 'seller' -> 'SELLER' */}
                    {user.role === 'SELLER' ? 'Người bán hàng' : 'Thành viên'}
                  </div>
                </div>
              </div>
              
              <div className="w-full space-y-1">
                {/* FIX 4: Sửa 'seller' -> 'SELLER' */}
                {user.role === 'SELLER' && (
                   <button 
                     onClick={() => router.push('/dashboard')}
                     className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-green-700 bg-green-50 rounded-xl hover:bg-green-100 transition-colors mb-2"
                   >
                     <LayoutDashboard size={18} />
                     Vào trang quản lý Shop
                   </button>
                )}
                
                <button 
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === 'orders' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Package size={18} />
                  Đơn mua hàng
                </button>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Settings size={18} />
                  Cài đặt tài khoản
                </button>
                <button 
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors mt-4"
                >
                  <LogOut size={18} />
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT CONTENT */}
          <div className="md:col-span-3">
             {activeTab === 'orders' && (
               <div className="space-y-4">
                 <h3 className="text-xl font-bold text-gray-800 mb-4">Lịch sử đơn hàng</h3>
                 {MOCK_ORDERS.map((order) => (
                   <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                     <div className="flex justify-between items-start mb-4">
                       <div>
                         <span className="font-bold text-gray-800 text-lg">{order.id}</span>
                         <p className="text-gray-500 text-sm mt-1">{order.date}</p>
                       </div>
                       <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                         order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                       }`}>
                         {order.status === 'completed' ? 'Đã giao' : 'Đang vận chuyển'}
                       </span>
                     </div>
                     
                     <div className="border-t border-b border-gray-50 py-4 my-4">
                       <ul className="space-y-2">
                         {order.items.map((item, index) => (
                           <li key={index} className="text-sm text-gray-700 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                              {item}
                           </li>
                         ))}
                       </ul>
                     </div>
                     
                     <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">Tổng tiền: <span className="text-green-600 font-bold text-base ml-1">{formatCurrency(order.total)}</span></span>
                        <button className="text-sm font-medium text-green-600 hover:underline">Xem chi tiết</button>
                     </div>
                   </div>
                 ))}
               </div>
             )}

             {activeTab === 'settings' && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center py-20">
                   <Settings size={48} className="text-gray-200 mx-auto mb-4"/>
                   <h3 className="text-lg font-bold text-gray-800">Chức năng đang phát triển</h3>
                   <p className="text-gray-500">Bạn sẽ sớm có thể đổi mật khẩu và cập nhật địa chỉ tại đây.</p>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
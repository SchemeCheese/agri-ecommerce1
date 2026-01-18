"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
// 1. Dùng Context
import { useAuth } from '@/context/AuthContext';
import { User, Package, MapPin, Phone, LogOut, Settings, LayoutDashboard } from 'lucide-react';
import { formatCurrency } from '@/utils/vi'; 

const MOCK_ORDERS = [
  {
    id: 'ORD-9921',
    date: '10/01/2026',
    status: 'shipping', // Dùng key để dễ style
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
  const { user, logout, isLoading } = useAuth(); // Lấy user từ Context
  const [activeTab, setActiveTab] = useState('orders');

  // Kiểm tra đăng nhập
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleLogout = () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      logout();
      router.push('/');
    }
  };

  if (isLoading || !user) return <div className="min-h-screen flex items-center justify-center text-gray-500">Đang tải hồ sơ...</div>;

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* --- CỘT TRÁI: THÔNG TIN CÁ NHÂN --- */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center sticky top-24">
            <div className="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-green-50 shadow-sm">
               {user.avatar ? (
                 <Image src={user.avatar} alt={user.name} fill className="object-cover" />
               ) : (
                 <div className="w-full h-full bg-green-100 flex items-center justify-center text-green-600 text-3xl font-bold">
                   {user.name.charAt(0).toUpperCase()}
                 </div>
               )}
            </div>
            
            <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
            <p className="text-gray-500 text-sm mb-6">{user.email}</p>

            {/* Nếu là Seller, hiện nút về Dashboard */}
            {user.role === 'seller' && (
               <button 
                 onClick={() => router.push('/dashboard')}
                 className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 transition mb-4 shadow-lg shadow-green-200"
               >
                 <LayoutDashboard size={18} /> Quản lý Shop
               </button>
            )}

            <div className="space-y-4 text-left bg-gray-50 p-4 rounded-xl mb-6">
              <div className="flex items-center text-gray-600 text-sm">
                <Phone size={16} className="mr-3 text-green-600 shrink-0"/>
                <span>0912 *** ***</span>
              </div>
              <div className="flex items-center text-gray-600 text-sm">
                <MapPin size={16} className="mr-3 text-green-600 shrink-0"/>
                <span>Hà Nội, Việt Nam</span>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 text-red-500 py-2 rounded-lg hover:bg-red-50 transition font-medium text-sm"
            >
              <LogOut size={18} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>

        {/* --- CỘT PHẢI: NỘI DUNG CHÍNH --- */}
        <div className="lg:col-span-3">
           
           {/* Tabs */}
           <div className="flex gap-4 border-b border-gray-100 mb-6">
              <button 
                onClick={() => setActiveTab('orders')}
                className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'orders' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                 <Package size={18}/> Lịch sử mua hàng
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'settings' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                 <Settings size={18}/> Cài đặt tài khoản
              </button>
           </div>

           {/* Content: Orders */}
           {activeTab === 'orders' && (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
               {MOCK_ORDERS.map((order) => (
                 <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-green-200 transition group">
                   <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 pb-4 border-b border-gray-50">
                     <div>
                       <div className="flex items-center gap-2">
                          <span className="font-bold text-lg text-gray-800">#{order.id}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {order.status === 'completed' ? 'Hoàn thành' : 'Đang giao'}
                          </span>
                       </div>
                       <span className="text-xs text-gray-400 mt-1 block">{order.date}</span>
                     </div>
                     <div className="mt-2 md:mt-0 text-right">
                        <span className="text-sm text-gray-500">Tổng tiền:</span>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(order.total)}</p>
                     </div>
                   </div>

                   <div className="bg-gray-50 p-4 rounded-xl">
                     <p className="text-xs font-bold text-gray-500 uppercase mb-2">Sản phẩm</p>
                     <ul className="space-y-2">
                       {order.items.map((item, index) => (
                         <li key={index} className="text-sm text-gray-700 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                            {item}
                         </li>
                       ))}
                     </ul>
                   </div>
                   
                   <div className="mt-4 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-sm font-medium text-green-600 hover:underline">Xem chi tiết</button>
                      {order.status === 'completed' && (
                         <button className="text-sm font-medium text-orange-500 hover:underline">Đánh giá</button>
                      )}
                   </div>
                 </div>
               ))}
             </div>
           )}

           {/* Content: Settings (Demo) */}
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
  );
}
"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { User, Package, MapPin, Phone, LogOut } from 'lucide-react';
import { formatCurrency } from '@/utils/vi'; 

const MOCK_ORDERS = [
  {
    id: 'ORD-9921',
    date: '10/01/2026',
    status: 'Đang giao hàng',
    total: 450000,
    items: ['Dâu tây Đà Lạt (x2)', 'Bơ sáp 034 (x1)']
  },
  {
    id: 'ORD-8812',
    date: '05/01/2026',
    status: 'Hoàn thành',
    total: 120000,
    items: ['Rau xà lách thủy canh (x3)']
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoggedIn, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn && mounted) {
      router.push('/login');
    }
  }, [isLoggedIn, router, mounted]);

  const handleLogout = () => {
    logout();
    alert("Đã đăng xuất thành công!");
    router.push('/');
  };

  if (!mounted || !user) return null;

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="w-full h-full rounded-full bg-green-100 flex items-center justify-center text-green-600 text-3xl font-bold border-2 border-green-200">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
            <p className="text-gray-500 text-sm mb-6">{user.email}</p>

            <div className="space-y-3 text-left">
              <div className="flex items-center text-gray-600 text-sm">
                <Phone size={16} className="mr-3 text-green-600"/>
                <span>0912 *** ***</span>
              </div>
              <div className="flex items-center text-gray-600 text-sm">
                <MapPin size={16} className="mr-3 text-green-600"/>
                <span>Hà Nội, Việt Nam</span>
              </div>
            </div>

            <hr className="my-6" />
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition"
            >
              <LogOut size={18} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-3">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <Package className="mr-2 text-green-600" />
            Lịch sử mua hàng
          </h1>

          <div className="space-y-4">
            {MOCK_ORDERS.map((order) => (
              <div key={order.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-4">
                  <div>
                    <span className="font-bold text-lg text-gray-800">#{order.id}</span>
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="text-sm text-gray-500">{order.date}</span>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      order.status === 'Hoàn thành' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="text-gray-600 text-sm mb-4">
                  <p className="font-semibold mb-1">Sản phẩm:</p>
                  <ul className="list-disc list-inside pl-1 text-gray-500">
                    {order.items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-between items-center border-t pt-4">
                  <span className="text-sm text-gray-500">Tổng tiền:</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(order.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
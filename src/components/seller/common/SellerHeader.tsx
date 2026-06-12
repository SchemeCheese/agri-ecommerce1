"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, Loader2, LogOut, Package, Repeat, Search, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { UserAvatar } from './UserAvatar';

type SellerNotification = {
  id: string;
  title: string;
  detail: string;
  href: string;
  kind: 'order' | 'dispute' | 'stock';
};

export const SellerHeader = () => {
  const [storeName, setStoreName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchMenu, setShowSearchMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<SellerNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { user, logout, switchRole } = useAuth();
  const router = useRouter();
  const canSwitch = !!user?.is_buyer && !!user?.is_seller;

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const [ordersResult, productsResult] = await Promise.allSettled([
        api.get('/orders/seller-orders'),
        api.get('/products/my-products'),
      ]);
      const orders = ordersResult.status === 'fulfilled' && Array.isArray(ordersResult.value.data)
        ? ordersResult.value.data
        : [];
      const products = productsResult.status === 'fulfilled' && Array.isArray(productsResult.value.data)
        ? productsResult.value.data
        : [];

      const next: SellerNotification[] = [];
      for (const order of orders) {
        if (order.status === 'PENDING') {
          next.push({
            id: `pending-${order.id}`,
            title: 'Đơn hàng mới chờ xác nhận',
            detail: `${order.buyer?.full_name || 'Người mua'} - #${String(order.id).slice(-8).toUpperCase()}`,
            href: `/dashboard/orders?search=${encodeURIComponent(order.id)}`,
            kind: 'order',
          });
        }
        if (order.status === 'ISSUE_REPORTED' && order.dispute?.status === 'PENDING_SELLER_RESPONSE') {
          next.push({
            id: `dispute-${order.id}`,
            title: 'Khiếu nại cần gửi bằng chứng',
            detail: `Đơn #${String(order.id).slice(-8).toUpperCase()}`,
            href: `/dashboard/orders?search=${encodeURIComponent(order.id)}`,
            kind: 'dispute',
          });
        }
      }

      for (const product of products) {
        const stock = Number(product.stock ?? product.stock_quantity ?? 0);
        if (product.status === 'ACTIVE' && stock > 0 && stock <= 10) {
          next.push({
            id: `stock-${product.id}`,
            title: 'Sản phẩm sắp hết hàng',
            detail: `${product.name} - còn ${stock} ${product.unit || ''}`.trim(),
            href: `/dashboard/products?search=${encodeURIComponent(product.name)}`,
            kind: 'stock',
          });
        }
      }

      setNotifications(next);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    api.get('/profile/me')
      .then((res) => {
        const name = res.data?.profile?.store_name || res.data?.full_name || 'Shop của bạn';
        setStoreName(name);
      })
      .catch(() => setStoreName('Shop của bạn'));
  }, []);

  useEffect(() => {
    void loadNotifications();
    const timer = window.setInterval(() => void loadNotifications(), 60_000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) setShowSearchMenu(false);
      if (notificationRef.current && !notificationRef.current.contains(target)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', closeMenus);
    return () => document.removeEventListener('mousedown', closeMenus);
  }, []);

  const goToSearch = (area: 'products' | 'orders') => {
    const query = searchQuery.trim();
    if (!query) return;
    setShowSearchMenu(false);
    router.push(`/dashboard/${area}?search=${encodeURIComponent(query)}`);
  };

  const openNotification = (notification: SellerNotification) => {
    setShowNotifications(false);
    router.push(notification.href);
  };

  const handleSwitchToBuyer = async () => {
    if (switching) return;
    setSwitching(true);
    try {
      const u = await switchRole('BUYER');
      if (u) router.push('/');
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi Kênh Người Bán?')) {
      logout();
    }
  };

  return (
    <header className="h-20 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 bg-gray-50/80 backdrop-blur-xl border-b border-gray-200/50">
      <div className="min-w-0 flex-1 pr-3">
        <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">
          Xin chào, {storeName || '...'}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Quản lý gian hàng của bạn</p>
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <div ref={searchRef} className="relative hidden xl:block">
          <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 w-72 focus-within:ring-2 focus-within:ring-green-500/20 transition-all">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchMenu(true);
              }}
              onFocus={() => setShowSearchMenu(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') goToSearch('products');
              }}
              placeholder="Tìm sản phẩm / mã đơn..."
              className="bg-transparent border-none outline-none text-sm ml-2 w-full"
            />
          </div>
          {showSearchMenu && searchQuery.trim() && (
            <div className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl">
              <button
                type="button"
                onClick={() => goToSearch('products')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-gray-700 hover:bg-green-50 hover:text-green-700"
              >
                <Package size={16} />
                Tìm trong sản phẩm đang bán
              </button>
              <button
                type="button"
                onClick={() => goToSearch('orders')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-gray-700 hover:bg-green-50 hover:text-green-700"
              >
                <ShoppingBag size={16} />
                Tìm đơn hàng theo mã đơn
              </button>
            </div>
          )}
        </div>

        <div ref={notificationRef} className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications((v) => !v)}
            className="relative p-2.5 bg-white rounded-full text-gray-400 hover:text-green-600 hover:bg-green-50 shadow-sm border border-gray-100 transition-all"
            aria-label="Thông báo"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 z-40 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-bold text-gray-900">Thông báo</p>
                <button
                  type="button"
                  onClick={() => void loadNotifications()}
                  className="text-xs font-semibold text-green-600 hover:text-green-700"
                >
                  Làm mới
                </button>
              </div>
              {notificationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  Chưa có thông báo cần xử lý.
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto p-2">
                  {notifications.map((notification) => {
                    const Icon =
                      notification.kind === 'dispute'
                        ? AlertTriangle
                        : notification.kind === 'stock'
                          ? Package
                          : ShoppingBag;
                    return (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => openNotification(notification)}
                        className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-gray-50"
                      >
                        <span className={`mt-0.5 rounded-full p-2 ${
                          notification.kind === 'dispute'
                            ? 'bg-orange-50 text-orange-600'
                            : notification.kind === 'stock'
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-green-50 text-green-600'
                        }`}>
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-gray-800">{notification.title}</span>
                          <span className="mt-0.5 block truncate text-xs text-gray-500">{notification.detail}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {canSwitch && (
          <button
            type="button"
            onClick={handleSwitchToBuyer}
            disabled={switching}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white hover:bg-green-50 text-gray-700 hover:text-green-600 rounded-full border border-gray-100 shadow-sm hover:shadow-md transition-all font-semibold text-sm disabled:opacity-60"
            title="Chuyển sang Mua hàng"
          >
            <Repeat size={16} />
            <span className="hidden md:inline">Mua hàng</span>
          </button>
        )}

        <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

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

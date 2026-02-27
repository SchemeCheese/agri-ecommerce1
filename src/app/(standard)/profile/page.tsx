'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/ui/Container';
import api from '@/lib/axios';
import Image from 'next/image';
import {
  User, Package, ShoppingBag, Clock,
  CheckCircle2, XCircle, ChevronRight, LogOut,
  Loader2, Mail, Phone, Shield, Store, X,
  CreditCard, Truck, Star, MessageSquare, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'orders'>('info');
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll để header đổi màu
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') {
      const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
          const res = await api.get('/orders/my-orders');
          setOrders(res.data);
        } catch (error) {
          console.error('Lỗi lấy đơn hàng:', error);
        } finally {
          setLoadingOrders(false);
        }
      };
      fetchOrders();
    }
  }, [activeTab]);

  const menuItems = [
    { id: 'info',   label: 'Thông tin cá nhân',  icon: <User size={18} />    },
    { id: 'orders', label: 'Lịch sử mua hàng',   icon: <Package size={18} /> },
  ];

  const getOrderStatus = (status: string) => {
    switch (status) {
      case 'PENDING':   return { text: 'Chờ xác nhận', color: 'text-amber-600 bg-amber-50 border border-amber-200',  icon: <Clock size={12}/> };
      case 'CONFIRMED': return { text: 'Đã xác nhận',  color: 'text-blue-600 bg-blue-50 border border-blue-200',     icon: <CheckCircle2 size={12}/> };
      case 'DELIVERED': return { text: 'Đã giao',       color: 'text-green-600 bg-green-50 border border-green-200', icon: <CheckCircle2 size={12}/> };
      case 'CANCELLED': return { text: 'Đã hủy',        color: 'text-red-500 bg-red-50 border border-red-200',       icon: <XCircle size={12}/> };
      default:          return { text: 'Đang xử lý',    color: 'text-blue-600 bg-blue-50 border border-blue-200',    icon: <Package size={12}/> };
    }
  };

  const getPaymentStatus = (payments: any[]) => {
    if (!payments || payments.length === 0) return { text: 'Chưa thanh toán', color: 'text-gray-500', icon: <AlertCircle size={14}/> };
    const p = payments[0];
    switch (p.status) {
      case 'SUCCESS': return { text: 'Đã thanh toán',    color: 'text-green-600', icon: <CheckCircle2 size={14}/>, method: p.payment_method };
      case 'FAILED':  return { text: 'Thanh toán lỗi',   color: 'text-red-500',   icon: <XCircle size={14}/>,      method: p.payment_method };
      default:        return { text: 'Chờ thanh toán',   color: 'text-amber-600', icon: <Clock size={14}/>,         method: p.payment_method };
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans">

      {/* BANNER */}
      <div className="relative w-full h-[30vh] min-h-[220px] flex items-center justify-center">
        <Image
          src="https://images.unsplash.com/photo-1660418011914-2bedc50017e2?q=80&w=2650&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Profile Banner"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-center text-white mt-16 px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Tài khoản của tôi</h1>
          <p className="text-base opacity-80">Quản lý thông tin và đơn hàng của bạn</p>
        </div>
      </div>

      <Container className="py-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-green-600 transition-colors">Trang chủ</Link>
          <ChevronRight size={14} />
          <span className="text-gray-900 font-semibold">Tài khoản</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ===== SIDEBAR TRÁI (3 CỘT) ===== */}
          <div className="lg:col-span-3 space-y-4">
            {/* Avatar Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-green-600 text-white flex items-center justify-center text-3xl font-black mx-auto mb-3 shadow-md shadow-green-100">
                {user?.full_name?.charAt(0).toUpperCase()}
              </div>
              <h2 className="font-bold text-gray-900 text-base line-clamp-1">{user?.full_name}</h2>
              <p className="text-gray-400 text-sm mt-0.5 truncate">{user?.email}</p>
              <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-100">
                {user?.role === 'SELLER' ? <><Store size={11}/> Nhà vườn</> : <><Shield size={11}/> Khách hàng</>}
              </span>
            </div>

            {/* Nav Menu */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                      activeTab === item.id
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {item.icon}
                    <span className="flex-1 text-left">{item.label}</span>
                    {activeTab === item.id && <ChevronRight size={14} />}
                  </button>
                ))}
                <div className="border-t border-gray-100 pt-1 mt-1">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm text-red-500 hover:bg-red-50 transition-all"
                  >
                    <LogOut size={18} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>

          {/* ===== NỘI DUNG PHẢI (9 CỘT) ===== */}
          <div className="lg:col-span-9">

            {/* TAB 1: THÔNG TIN */}
            {activeTab === 'info' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Hồ sơ cá nhân</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Thông tin tài khoản của bạn</p>
                  </div>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoField icon={<User size={15}/>}   label="Họ và tên"     value={user?.full_name} />
                    <InfoField icon={<Mail size={15}/>}   label="Email"          value={user?.email} />
                    <InfoField icon={<Phone size={15}/>}  label="Số điện thoại" value={(user as any)?.phone_number} />
                    <InfoField icon={<Shield size={15}/>} label="Vai trò"        value={user?.role === 'SELLER' ? 'Nhà vườn / Người bán' : 'Khách hàng'} />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LỊCH SỬ ĐƠN HÀNG */}
            {activeTab === 'orders' && (
              <div>
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-5 mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Lịch sử đơn hàng</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {orders.length > 0 ? `${orders.length} đơn hàng` : 'Theo dõi trạng thái đơn hàng'}
                    </p>
                  </div>
                  <Package size={22} className="text-gray-300" />
                </div>

                {/* Loading */}
                {loadingOrders && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center py-24">
                    <Loader2 className="animate-spin text-green-600 mb-3" size={32} />
                    <p className="text-sm text-gray-400 font-medium">Đang tải đơn hàng...</p>
                  </div>
                )}

                {/* Empty */}
                {!loadingOrders && orders.length === 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-24 px-6">
                    <ShoppingBag size={72} className="mx-auto text-gray-200 mb-5" />
                    <h4 className="font-bold text-gray-700 text-lg mb-2">Chưa có đơn hàng nào</h4>
                    <p className="text-sm text-gray-400 mb-6">Hãy khám phá và mua sắm những sản phẩm tươi ngon!</p>
                    <Link href="/products" className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 transition">
                      Mua sắm ngay <ChevronRight size={16}/>
                    </Link>
                  </div>
                )}

                {/* Order List */}
                {!loadingOrders && orders.length > 0 && (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      const status = getOrderStatus(order.status);
                      const payment = getPaymentStatus(order.payments);
                      const shopName     = order.seller?.profile?.store_name || order.seller?.full_name || 'Agri Shop';
                      const isDelivered  = order.status === 'DELIVERED';
                      const isPaid       = order.payments?.[0]?.status === 'SUCCESS';

                      return (
                        <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">

                          {/* Order Header */}
                          <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold bg-gray-900 text-white px-2.5 py-1 rounded-md tracking-wide">
                                #{order.id.slice(-8).toUpperCase()}
                              </span>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                                {status.icon} {status.text}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400 font-medium">
                                {new Date(order.created_at).toLocaleDateString('vi-VN', {
                                  day: '2-digit', month: '2-digit', year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Shop info */}
                          <div className="px-6 pt-4 pb-2 flex items-center gap-2 border-b border-dashed border-gray-100">
                            <Store size={14} className="text-green-600" />
                            <span className="text-sm font-semibold text-gray-700">{shopName}</span>
                          </div>

                          {/* Order Items */}
                          <div className="px-6 py-4 space-y-4">
                            {order.order_items.map((item: any) => (
                              <div key={item.id} className="flex gap-4 items-center">
                                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-100 flex-shrink-0 bg-gray-50">
                                  <Image
                                    src={item.product?.images?.[0] ?? '/placeholder.png'}
                                    alt={item.product?.name || ''}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">
                                    {item.product?.name}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {item.product?.unit} · x{item.quantity}
                                  </p>
                                </div>
                                <p className="text-sm font-bold text-green-600 flex-shrink-0">
                                  {(Number(item.negotiated_price) * Number(item.quantity)).toLocaleString()}đ
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Order Footer */}
                          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
                            <div className={`inline-flex items-center gap-1.5 text-xs font-semibold ${payment.color}`}>
                              <CreditCard size={13}/> {payment.text}
                              {(payment as any).method && (
                                <span className="text-gray-400 font-normal">({(payment as any).method})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs text-gray-400">Tổng thanh toán</p>
                                <p className="text-lg font-black text-green-600">
                                  {Number(order.final_total_price).toLocaleString()}đ
                                </p>
                              </div>
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all whitespace-nowrap"
                              >
                                Xem chi tiết
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Container>

      {/* ===== DIALOG CHI TIẾT ĐƠN HÀNG ===== */}
      {selectedOrder && (
        <OrderDetailDialog
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          getOrderStatus={getOrderStatus}
          getPaymentStatus={getPaymentStatus}
        />
      )}
    </div>
  );
}

/* ============================================================
   DIALOG COMPONENT
   ============================================================ */
function OrderDetailDialog({
  order, onClose, getOrderStatus, getPaymentStatus
}: {
  order: any;
  onClose: () => void;
  getOrderStatus: (s: string) => any;
  getPaymentStatus: (p: any[]) => any;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const orderStatus  = getOrderStatus(order.status);
  const payStatus    = getPaymentStatus(order.payments);
  const shopName     = order.seller?.profile?.store_name || order.seller?.full_name || 'Agri Shop';
  const isDelivered  = order.status === 'DELIVERED';
  const isPaid       = order.payments?.[0]?.status === 'SUCCESS';

  // Đóng khi click nền
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Đóng khi nhấn Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">

        {/* Dialog Header */}
        <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-100 flex items-center justify-between z-10 rounded-t-2xl">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Chi tiết đơn hàng</h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">#{order.id.slice(-8).toUpperCase()}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Trạng thái tổng quan */}
          <div className="grid grid-cols-2 gap-3">
            {/* Trạng thái đơn hàng */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Package size={12}/> Trạng thái
              </p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${orderStatus.color}`}>
                {orderStatus.icon} {orderStatus.text}
              </span>
              {isDelivered && (
                <p className="text-[11px] text-green-600 font-semibold mt-2 flex items-center gap-1">
                  <CheckCircle2 size={11}/> Đã nhận hàng
                </p>
              )}
            </div>

            {/* Trạng thái thanh toán */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CreditCard size={12}/> Thanh toán
              </p>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${payStatus.color}`}>
                {payStatus.icon} {payStatus.text}
              </span>
              {(payStatus as any).method && (
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Phương thức: <span className="font-semibold text-gray-600">{(payStatus as any).method}</span>
                </p>
              )}
              {isPaid && (
                <p className="text-[11px] text-green-600 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 size={11}/> Đã thanh toán
                </p>
              )}
            </div>
          </div>

          {/* Thông tin shop + địa chỉ */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2.5">
            <div className="flex items-center gap-2">
              <Store size={14} className="text-green-600 flex-shrink-0"/>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Cửa hàng</span>
              <span className="text-sm font-bold text-gray-800 ml-auto">{shopName}</span>
            </div>
            <div className="flex items-start gap-2">
              <Truck size={14} className="text-blue-500 flex-shrink-0 mt-0.5"/>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Địa chỉ</span>
              <span className="text-xs text-gray-600 ml-auto text-right max-w-[60%]">{order.shipping_address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-gray-400 flex-shrink-0"/>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Ngày đặt</span>
              <span className="text-xs text-gray-600 ml-auto">
                {new Date(order.created_at).toLocaleString('vi-VN')}
              </span>
            </div>
          </div>

          {/* Danh sách sản phẩm */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Sản phẩm đã mua
            </p>
            <div className="space-y-3">
              {order.order_items.map((item: any) => {
                // Kiểm tra đã review chưa
                const hasReview = order.reviews?.length > 0;

                return (
                  <div key={item.id} className="flex gap-3 items-start p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 bg-gray-50">
                      <Image
                        src={item.product?.images?.[0] ?? '/placeholder.png'}
                        alt={item.product?.name || ''}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-snug">
                        {item.product?.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.product?.unit} · Số lượng: <span className="font-bold text-gray-600">{item.quantity}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Đơn giá: <span className="font-semibold text-gray-700">{Number(item.negotiated_price).toLocaleString()}đ</span>
                      </p>

                      {/* Badge đánh giá — chỉ hiện khi đã nhận hàng */}
                      {isDelivered && (
                        <div className="mt-2">
                          {hasReview ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                              <Star size={10} className="fill-green-600"/> Đã đánh giá
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                              <MessageSquare size={10}/> Chưa đánh giá
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-black text-green-600 flex-shrink-0 pt-0.5">
                      {(Number(item.negotiated_price) * Number(item.quantity)).toLocaleString()}đ
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review hiện tại (nếu có) */}
          {order.reviews?.length > 0 && (
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Star size={12} className="text-green-600"/> Đánh giá của bạn
              </p>
              {order.reviews.map((review: any) => (
                <div key={review.id} className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        className={s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                      />
                    ))}
                    <span className="text-xs text-gray-400 ml-1">
                      {new Date(review.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-700 italic">"{review.comment}"</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tổng cộng */}
          <div className="bg-gray-900 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">Tổng thanh toán</p>
                <p className="text-2xl font-black text-green-400 mt-0.5">
                  {Number(order.final_total_price).toLocaleString()}đ
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">{order.order_items.length} sản phẩm</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isPaid ? '✓ Đã thanh toán' : '⏳ Chờ thanh toán'}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ============================================================
   INFO FIELD COMPONENT
   ============================================================ */
function InfoField({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
        {icon} {label}
      </p>
      <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-100 font-medium text-gray-800 text-sm">
        {value || <span className="text-gray-400 italic">Chưa cập nhật</span>}
      </div>
    </div>
  );
}
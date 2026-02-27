'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';
import { Container } from '@/components/ui/Container';
import { 
  MapPin, CreditCard, Loader2, ChevronRight, 
  Wallet, Building, Truck, ShieldCheck, Package
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { carts, activeUserId, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');

  useEffect(() => {
    setMounted(true);
    if (user) setFullName(user.full_name || '');
  }, [user]);

  const items = carts[activeUserId] || [];
  const totalPrice = items.reduce((total, item) => total + item.price * item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (!address || !phoneNumber) {
      alert('Vui lòng nhập đầy đủ thông tin giao hàng');
      return;
    }
    setLoading(true);
    try {
      await api.post('/orders/checkout', {
        shipping_address: `${address} (SĐT: ${phoneNumber})`,
        items: items.map(item => ({
          product_id: item.id,
          seller_id: item.seller_id,
          quantity: item.quantity,
          price: item.price
        }))
      });
      clearCart();
      router.push('/order-confirmation');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi đặt hàng. Hãy thử xóa giỏ và thêm lại sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const paymentMethods = [
    { id: 'cod',     title: 'Thanh toán khi nhận hàng', sub: 'Tiền mặt (COD)',                icon: <Truck size={18}/>    },
    { id: 'momo',    title: 'Ví điện tử MoMo',          sub: 'Thanh toán qua app MoMo',        icon: <Wallet size={18}/>   },
    { id: 'zalopay', title: 'Ví ZaloPay',               sub: 'Thanh toán qua ZaloPay',         icon: <Wallet size={18}/>   },
    { id: 'bank',    title: 'Chuyển khoản ngân hàng',   sub: 'Internet Banking / QR Code',     icon: <Building size={18}/> },
  ];

  return (
    <div className="bg-gray-50 min-h-screen font-sans">

      {/* --- BANNER ĐẦU TRANG (đồng bộ với /products và /about) --- */}
      <div className="relative w-full h-[20vh] min-h-[160px] flex items-center justify-center">
        <Image
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=2574&auto=format&fit=crop"
          alt="Checkout Banner"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-center text-white mt-16 px-4">
          <h1 className="text-3xl font-bold">Thanh toán đơn hàng</h1>
        </div>
      </div>

      <Container className="py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-green-600 transition-colors">Trang chủ</Link>
          <ChevronRight size={14} />
          <Link href="/cart" className="hover:text-green-600 transition-colors">Giỏ hàng</Link>
          <ChevronRight size={14} />
          <span className="text-gray-900 font-semibold">Thanh toán</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ===== CỘT TRÁI (8 CỘT) ===== */}
          <div className="lg:col-span-8 space-y-6">

            {/* 1. Thông tin vận chuyển */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                <div className="bg-green-600 p-2 rounded-lg text-white">
                  <MapPin size={16} />
                </div>
                <h2 className="font-bold text-gray-900">Thông tin vận chuyển</h2>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Họ tên người nhận</label>
                  <input
                    type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-green-500 focus:bg-white outline-none transition-all text-sm font-medium"
                    placeholder="Nhập họ tên..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Số điện thoại</label>
                  <input
                    type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-green-500 focus:bg-white outline-none transition-all text-sm font-medium"
                    placeholder="090..."
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Địa chỉ nhận hàng</label>
                  <textarea
                    rows={3} value={address} onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-green-500 focus:bg-white outline-none transition-all text-sm font-medium resize-none"
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                  />
                </div>
              </div>
            </div>

            {/* 2. Phương thức thanh toán */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg text-white">
                  <CreditCard size={16} />
                </div>
                <h2 className="font-bold text-gray-900">Phương thức thanh toán</h2>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-4 text-left ${
                      paymentMethod === method.id
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg flex-shrink-0 transition-colors ${
                      paymentMethod === method.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {method.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{method.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{method.sub}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      paymentMethod === method.id ? 'border-green-600' : 'border-gray-300'
                    }`}>
                      {paymentMethod === method.id && (
                        <div className="w-2 h-2 rounded-full bg-green-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ===== CỘT PHẢI (4 CỘT) ===== */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">

              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                <Package size={18} className="text-gray-400" />
                <h3 className="font-bold text-gray-900">Chi tiết đơn hàng</h3>
                <span className="ml-auto text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {items.length} món
                </span>
              </div>

              {/* Item list */}
              <div className="px-6 py-4 space-y-4 max-h-[320px] overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 items-center group">
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 bg-gray-50">
                      <Image
                        src={item.images?.[0] ?? '/placeholder.png'}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute -top-1 -right-1 bg-gray-900 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {item.quantity}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.unit}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 flex-shrink-0">
                      {(item.price * item.quantity).toLocaleString()}đ
                    </p>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="px-6 py-4 border-t border-dashed border-gray-200 bg-gray-50/50 space-y-3">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Tạm tính</span>
                  <span className="font-medium text-gray-700">{totalPrice.toLocaleString()}đ</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Phí vận chuyển</span>
                  <span className="font-semibold text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded">Miễn phí</span>
                </div>
                <div className="flex justify-between items-end pt-3 border-t border-gray-200">
                  <span className="font-bold text-gray-900 text-sm">Tổng cộng</span>
                  <div className="text-right">
                    <p className="text-2xl font-black text-green-600 leading-none">
                      {totalPrice.toLocaleString()}đ
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Đã bao gồm thuế phí</p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="px-6 pb-6 pt-2">
                <button
                  onClick={handlePlaceOrder}
                  disabled={loading || items.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-600/20 hover:shadow-green-600/30 hover:scale-[1.01] flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <><ShieldCheck size={18} /> Đặt hàng ngay</>
                  )}
                </button>
                <p className="text-center text-[11px] text-gray-400 mt-3 flex items-center justify-center gap-1">
                  <ShieldCheck size={12} className="text-green-500" />
                  Thông tin được bảo mật tuyệt đối
                </p>
              </div>
            </div>
          </div>

        </div>
      </Container>
    </div>
  );
}
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';
import { Container } from '@/components/ui/Container';
import { 
  MapPin, CreditCard, Loader2, ChevronRight, 
  Wallet, Building, Truck, ShieldCheck, Package,
  X, User, Phone, CheckCircle2, Tag, AlertCircle, Ticket, Store
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { carts, activeUserId, clearCart, removeItems } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Voucher: per-shop state
  type ShopVoucher = { inputCode: string; code: string; discount_amount: number; isValidating: boolean; error: string };
  const [voucherByShop, setVoucherByShop] = useState<Record<string, ShopVoucher>>({});
  const getShopVoucher = (shopId: string): ShopVoucher =>
    voucherByShop[shopId] ?? { inputCode: '', code: '', discount_amount: 0, isValidating: false, error: '' };

  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');

  useEffect(() => {
    setMounted(true);
    if (user) setFullName(user.full_name || '');
  }, [user]);

  const searchParams = useSearchParams();
  const isBuyNow = searchParams?.get('bn') === '1';
  const buyNowItem = isBuyNow ? {
    id: searchParams!.get('id') || '',
    name: decodeURIComponent(searchParams!.get('name') || ''),
    price: Number(searchParams!.get('price') || 0),
    quantity: Number(searchParams!.get('qty') || 1),
    images: [decodeURIComponent(searchParams!.get('img') || '')],
    unit: decodeURIComponent(searchParams!.get('unit') || ''),
    seller_id: decodeURIComponent(searchParams!.get('sellerId') || ''),
  } : null;

  const selectedIds = searchParams?.get('ids')?.split(',').filter(Boolean) ?? [];
  const allCartItems = carts[activeUserId] || [];
  const items = (isBuyNow && buyNowItem)
    ? [buyNowItem]
    : selectedIds.length > 0
      ? allCartItems.filter(item => selectedIds.includes(item.id))
      : allCartItems;
  const totalPrice = items.reduce((total, item) => total + item.price * item.quantity, 0);

  // Group items by shop (supports both new shop obj and legacy seller_id)
  const shopGroups: Record<string, typeof items> = items.reduce((acc, item) => {
    const shopId = (item as any).shop?.id || item.seller_id || 'unknown';
    if (!acc[shopId]) acc[shopId] = [];
    acc[shopId].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const totalDiscount = Object.values(voucherByShop).reduce((s, v) => s + (v.discount_amount ?? 0), 0);
  const finalTotal = Math.max(0, totalPrice - totalDiscount);

  const handleApplyShopVoucher = async (shopId: string, code: string, subtotal: number) => {
    if (!code.trim()) return;
    setVoucherByShop(prev => ({
      ...prev,
      [shopId]: { ...getShopVoucher(shopId), isValidating: true, error: '' }
    }));
    try {
      const res = await api.post('/vouchers/validate', {
        code: code.trim().toUpperCase(),
        seller_id: shopId,
        order_total: subtotal,
      });
      setVoucherByShop(prev => ({
        ...prev,
        [shopId]: { inputCode: code, code: code.trim().toUpperCase(), discount_amount: res.data.discount_amount || 0, isValidating: false, error: '' }
      }));
    } catch (err: any) {
      setVoucherByShop(prev => ({
        ...prev,
        [shopId]: { ...prev[shopId], isValidating: false, error: err.response?.data?.message || 'Mã không hợp lệ hoặc đã hết hạn.' }
      }));
    }
  };

  const handleRemoveShopVoucher = (shopId: string) => {
    setVoucherByShop(prev => ({
      ...prev,
      [shopId]: { inputCode: '', code: '', discount_amount: 0, isValidating: false, error: '' }
    }));
  };

  const setVoucherInput = (shopId: string, value: string) => {
    setVoucherByShop(prev => ({
      ...prev,
      [shopId]: { ...getShopVoucher(shopId), inputCode: value, error: '' }
    }));
  };

  const handlePlaceOrder = async () => {
    if (!address || !phoneNumber) {
      alert('Vui lòng nhập đầy đủ thông tin giao hàng');
      return;
    }
    setLoading(true);
    try {
      const pmMap: Record<string, string> = { cod: 'COD', momo: 'MOMO', zalopay: 'ZALOPAY', bank: 'QR_CODE' };
      const seller_orders = Object.entries(shopGroups).map(([shopId, shopItems]) => ({
        seller_id: shopId,
        items: shopItems.map(i => ({
          product_id: i.id,
          quantity: i.quantity,
          price: i.price,
        })),
        voucher_code: voucherByShop[shopId]?.code || undefined,
      }));
      await api.post('/orders/checkout', {
        shipping_address: `${address} (SĐT: ${phoneNumber})`,
        payment_method: pmMap[paymentMethod] || 'COD',
        seller_orders,
      });
      if (!isBuyNow) {
        if (selectedIds.length > 0) {
          removeItems(selectedIds);
        } else {
          clearCart();
        }
      }
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

            {/* 3. Danh sách đặt hàng theo shop */}
            {Object.entries(shopGroups).map(([shopId, shopItems]) => {
              const shopData = (shopItems[0] as any).shop;
              const shopName = shopData?.store_name || shopData?.name || 'Shop';
              const shopAvatar = shopData?.avatar_url || shopData?.avatar || null;
              const subtotal = shopItems.reduce((s, i) => s + i.price * i.quantity, 0);
              const sv = getShopVoucher(shopId);
              return (
                <div key={shopId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Shop header */}
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                    <div className="relative w-9 h-9 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0">
                      {shopAvatar
                        ? <Image src={shopAvatar} alt={shopName} fill className="object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-400"><Store size={15} /></div>}
                    </div>
                    <span className="font-bold text-gray-800">{shopName}</span>
                    <span className="ml-auto text-xs text-gray-400">{shopItems.length} sản phẩm</span>
                  </div>

                  {/* Items */}
                  <div className="px-5 py-4 space-y-3">
                    {shopItems.map(item => (
                      <div key={item.id} className="flex gap-3 items-center">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 bg-gray-50">
                          <Image src={item.images?.[0] ?? '/placeholder.png'} alt={item.name} fill className="object-cover" />
                          <div className="absolute -top-1 -right-1 bg-gray-900 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{item.quantity}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 line-clamp-1">{item.name}</p>
                          <p className="text-xs text-gray-400">{item.unit}</p>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{(item.price * item.quantity).toLocaleString()}đ</p>
                      </div>
                    ))}
                  </div>

                  {/* Per-shop voucher */}
                  <div className="px-5 py-4 border-t border-dashed border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                        <Ticket size={13} className="text-orange-500" /> Mã giảm giá shop
                      </span>
                      {sv.code && (
                        <button onClick={() => handleRemoveShopVoucher(shopId)} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                          <X size={11} /> Xóa
                        </button>
                      )}
                    </div>
                    {sv.code ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-sm font-bold text-green-700">{sv.code}</span>
                          <p className="text-xs text-green-600">Giảm {sv.discount_amount.toLocaleString()}đ</p>
                        </div>
                        <CheckCircle2 size={15} className="text-green-500" />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={sv.inputCode}
                            onChange={e => setVoucherInput(shopId, e.target.value.toUpperCase())}
                            placeholder="Nhập mã giảm giá"
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-green-500 uppercase font-medium"
                          />
                          <button
                            onClick={() => handleApplyShopVoucher(shopId, sv.inputCode, subtotal)}
                            disabled={sv.isValidating || !sv.inputCode.trim()}
                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-bold rounded-lg transition flex items-center gap-1"
                          >
                            {sv.isValidating && <Loader2 size={13} className="animate-spin" />}
                            Áp dụng
                          </button>
                        </div>
                        {sv.error && (
                          <p className="flex items-center gap-1 text-xs text-red-500"><AlertCircle size={12} /> {sv.error}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Shop subtotal */}
                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <span className="text-sm text-gray-500">Tổng shop:</span>
                    <div className="text-right">
                      {sv.discount_amount > 0 && <p className="text-xs text-gray-400 line-through">{subtotal.toLocaleString()}đ</p>}
                      <p className="font-bold text-gray-900">{(subtotal - sv.discount_amount).toLocaleString()}đ</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===== CỘT PHẢI (4 CỘT) ===== */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
              <div className="px-6 py-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Tóm tắt thanh toán</h3>
                <p className="text-xs text-gray-400 mt-0.5">{items.length} sản phẩm · {Object.keys(shopGroups).length} shop</p>
              </div>

              {/* Per-shop breakdown */}
              <div className="px-6 py-4 space-y-4 divide-y divide-dashed divide-gray-100">
                {Object.entries(shopGroups).map(([shopId, shopItems]) => {
                  const shopData = (shopItems[0] as any).shop;
                  const shopName = shopData?.store_name || shopData?.name || 'Shop';
                  const subtotal = shopItems.reduce((s, i) => s + i.price * i.quantity, 0);
                  const sv = getShopVoucher(shopId);
                  const discount = sv.discount_amount;
                  return (
                    <div key={shopId} className="pt-3 first:pt-0 space-y-1.5">
                      <p className="text-xs font-bold text-gray-700 truncate">{shopName}</p>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Tạm tính ({shopItems.reduce((s, i) => s + i.quantity, 0)} sp)</span>
                        <span>{subtotal.toLocaleString()}đ</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-sm text-orange-500 font-semibold">
                          <span>Voucher ({sv.code})</span>
                          <span>-{discount.toLocaleString()}đ</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="px-6 py-4 border-t border-dashed border-gray-200 bg-gray-50/50 space-y-3">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Phí vận chuyển</span>
                  <span className="font-semibold text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded">Miễn phí</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-orange-500 font-semibold">
                    <span>Tổng giảm giá</span>
                    <span>-{totalDiscount.toLocaleString()}đ</span>
                  </div>
                )}
                <div className="flex justify-between items-end pt-3 border-t border-gray-200">
                  <span className="font-bold text-gray-900 text-sm">Tổng cộng</span>
                  <div className="text-right">
                    {totalDiscount > 0 && <p className="text-xs text-gray-400 line-through">{totalPrice.toLocaleString()}đ</p>}
                    <p className="text-2xl font-black text-green-600 leading-none">{finalTotal.toLocaleString()}đ</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Đã bao gồm thuế phí</p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="px-6 pb-6 pt-2">
                <button
                  onClick={() => {
                    if (!address.trim() || !phoneNumber.trim()) {
                      alert('Vui lòng nhập đầy đủ thông tin giao hàng');
                      return;
                    }
                    setShowConfirmDialog(true);
                  }}
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

      {/* ===== DIALOG XÁC NHẬN ĐẶT HÀNG ===== */}
      {showConfirmDialog && (
        <CheckoutConfirmDialog
          items={items}
          shopGroups={shopGroups}
          voucherByShop={voucherByShop}
          fullName={fullName}
          phoneNumber={phoneNumber}
          address={address}
          paymentMethod={paymentMethods.find(m => m.id === paymentMethod)!}
          totalPrice={totalPrice}
          totalDiscount={totalDiscount}
          finalTotal={finalTotal}
          loading={loading}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={handlePlaceOrder}
        />
      )}
    </div>
  );
}

/* ============================================================
   CHECKOUT CONFIRM DIALOG
   ============================================================ */
function CheckoutConfirmDialog({
  items, shopGroups, voucherByShop,
  fullName, phoneNumber, address,
  paymentMethod, totalPrice, totalDiscount, finalTotal, loading,
  onClose, onConfirm
}: {
  items: any[];
  shopGroups: Record<string, any[]>;
  voucherByShop: Record<string, any>;
  fullName: string;
  phoneNumber: string;
  address: string;
  paymentMethod: { id: string; title: string; sub: string; icon: React.ReactNode };
  totalPrice: number;
  totalDiscount: number;
  finalTotal: number;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

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

        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-100 flex items-center justify-between z-10 rounded-t-2xl">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Xác nhận đơn hàng</h3>
            <p className="text-xs text-gray-400 mt-0.5">Vui lòng kiểm tra lại trước khi đặt</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Thông tin người nhận */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Thông tin giao hàng</p>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <User size={13} className="text-green-600" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Người nhận</p>
                <p className="text-sm font-bold text-gray-800">{fullName || 'Chưa nhập'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Phone size={13} className="text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Số điện thoại</p>
                <p className="text-sm font-bold text-gray-800">{phoneNumber}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin size={13} className="text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Địa chỉ nhận hàng</p>
                <p className="text-sm font-medium text-gray-700 leading-relaxed">{address}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <CreditCard size={13} className="text-purple-600" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Phương thức thanh toán</p>
                <p className="text-sm font-bold text-gray-800">{paymentMethod?.title}</p>
              </div>
            </div>
          </div>

          {/* Danh sách sản phẩm */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Sản phẩm đặt mua ({items.length} món)
            </p>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 items-center p-3 rounded-xl border border-gray-100">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 bg-gray-50">
                    <Image
                      src={item.images?.[0] ?? '/placeholder.png'}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute -top-1 -right-1 bg-gray-900 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {item.quantity}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.unit} · x{item.quantity}</p>
                  </div>
                  <p className="text-sm font-black text-green-600 flex-shrink-0">
                    {(item.price * item.quantity).toLocaleString()}đ
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tổng tiền */}
          <div className="bg-gray-900 rounded-xl p-5 text-white space-y-2">
            {Object.entries(shopGroups).map(([shopId, shopItems]) => {
              const shopData = (shopItems[0] as any).shop;
              const shopName = shopData?.store_name || shopData?.name || 'Shop';
              const subtotal = shopItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
              const sv = voucherByShop[shopId];
              const discount = sv?.discount_amount ?? 0;
              return (
                <div key={shopId} className="flex justify-between text-sm text-gray-300">
                  <span className="truncate max-w-[60%]">{shopName}</span>
                  <span className="font-semibold">
                    {discount > 0 ? (
                      <><span className="line-through text-gray-500 text-xs mr-1">{subtotal.toLocaleString()}đ</span>{(subtotal - discount).toLocaleString()}đ</>
                    ) : `${subtotal.toLocaleString()}đ`}
                  </span>
                </div>
              );
            })}
            <div className="border-t border-gray-700 pt-2 flex items-end justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">Tổng thanh toán</p>
                {totalDiscount > 0 && (
                  <p className="text-sm text-gray-400 line-through">{totalPrice.toLocaleString()}đ</p>
                )}
                <p className="text-2xl font-black text-green-400">{finalTotal.toLocaleString()}đ</p>
                {totalDiscount > 0 && (
                  <p className="text-xs text-orange-400">Đã giảm {totalDiscount.toLocaleString()}đ</p>
                )}
                <p className="text-[11px] text-gray-400 mt-1">Đã bao gồm phí vận chuyển miễn phí</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">{items.length} sản phẩm</p>
                <p className="text-xs text-green-400 font-semibold mt-1">Freeship</p>
              </div>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Kiểm tra lại
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-600/20 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <><CheckCircle2 size={18} /> Xác nhận đặt hàng</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
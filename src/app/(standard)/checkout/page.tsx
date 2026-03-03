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
  X, User, Phone, CheckCircle2, Tag, AlertCircle, Ticket, ChevronDown
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
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');
  // Ví voucher đã lưu
  const [savedVouchers, setSavedVouchers] = useState<any[]>([]);
  const [showVoucherWallet, setShowVoucherWallet] = useState(false);
  const [loadingWallet, setLoadingWallet] = useState(false);

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
  const finalTotal = Math.max(0, totalPrice - discountAmount);

  const handleApplyVoucher = async () => {
    if (!discountCode.trim()) return;
    setVoucherLoading(true);
    setVoucherError('');
    try {
      // Get seller_id from first item (single seller checkout assumption)
      const sellerId = items[0]?.seller_id || '';
      if (!sellerId) {
        setVoucherError('Không xác định được shop. Vui lòng thêm sản phẩm lại vào giỏ.');
        return;
      }
      const res = await api.post('/vouchers/validate', {
        code: discountCode.trim().toUpperCase(),
        seller_id: sellerId,
        order_total: totalPrice,
      });
      setDiscountAmount(res.data.discount_amount || 0);
      setDiscountApplied(true);
    } catch (err: any) {
      setVoucherError(err.response?.data?.message || 'Mã không hợp lệ hoặc đã hết hạn.');
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setDiscountApplied(false);
    setDiscountCode('');
    setDiscountAmount(0);
    setVoucherError('');
  };

  // Fetch ví voucher đã lưu
  const handleOpenWallet = async () => {
    setShowVoucherWallet(true);
    if (savedVouchers.length > 0) return;
    setLoadingWallet(true);
    try {
      const res = await api.get('/vouchers/saved');
      setSavedVouchers(Array.isArray(res.data) ? res.data : []);
    } catch { setSavedVouchers([]); }
    finally { setLoadingWallet(false); }
  };

  // Chọn voucher từ ví và auto-validate
  const handlePickVoucher = async (code: string) => {
    setShowVoucherWallet(false);
    setDiscountCode(code);
    setVoucherError('');
    setVoucherLoading(true);
    try {
      const sellerId = items[0]?.seller_id || '';
      if (!sellerId) {
        setVoucherError('Không xác định được shop. Vui lòng thêm sản phẩm lại vào giỏ.');
        setVoucherLoading(false);
        return;
      }
      const res = await api.post('/vouchers/validate', {
        code: code.toUpperCase(),
        seller_id: sellerId,
        order_total: totalPrice,
      });
      setDiscountAmount(res.data.discount_amount || 0);
      setDiscountApplied(true);
    } catch (err: any) {
      setVoucherError(err.response?.data?.message || 'Mã không áp dụng được cho đơn này.');
    } finally {
      setVoucherLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!address || !phoneNumber) {
      alert('Vui lòng nhập đầy đủ thông tin giao hàng');
      return;
    }
    setLoading(true);
    try {
      const pmMap: Record<string, string> = { cod: 'COD', momo: 'MOMO', zalopay: 'ZALOPAY', bank: 'QR_CODE' };
      await api.post('/orders/checkout', {
        shipping_address: `${address} (SĐT: ${phoneNumber})`,
        payment_method: pmMap[paymentMethod] || 'COD',
        ...(discountApplied && discountCode ? { voucher_code: discountCode.trim().toUpperCase() } : {}),
        items: items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price
        }))
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

              {/* Mã giảm giá */}
              <div className="px-6 py-4 border-t border-dashed border-gray-200">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Ticket size={14} className="text-orange-500"/> Mã giảm giá
                  </p>
                  {!discountApplied && (
                    <button onClick={handleOpenWallet}
                      className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-full transition border border-green-200">
                      <Ticket size={12}/> Chọn từ ví <ChevronDown size={11}/>
                    </button>
                  )}
                </div>
                {discountApplied ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                    <div>
                      <span className="text-sm font-bold text-green-700">{discountCode}</span>
                      <p className="text-xs text-green-600 mt-0.5">Giảm {discountAmount.toLocaleString()}đ</p>
                    </div>
                    <button onClick={handleRemoveVoucher} className="text-gray-400 hover:text-red-500 ml-2"><X size={16}/></button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={discountCode}
                        onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setVoucherError(''); }}
                        placeholder="Nhập mã giảm giá"
                        className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10 uppercase font-medium"
                      />
                      <button
                        onClick={handleApplyVoucher}
                        disabled={voucherLoading || !discountCode.trim()}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-bold rounded-lg transition whitespace-nowrap flex items-center gap-1"
                      >
                        {voucherLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                        Áp dụng
                      </button>
                    </div>
                    {voucherError && (
                      <div className="flex items-center gap-1.5 text-xs text-red-500">
                        <AlertCircle size={12}/> {voucherError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Ví Voucher Modal */}
              {showVoucherWallet && (
                <div className="mx-6 mb-4 border border-orange-200 rounded-xl overflow-hidden bg-orange-50/50 shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 bg-orange-500 text-white">
                    <p className="text-sm font-bold flex items-center gap-2"><Ticket size={14}/> Chọn voucher từ ví</p>
                    <button onClick={() => setShowVoucherWallet(false)}><X size={16}/></button>
                  </div>
                  {loadingWallet ? (
                    <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-orange-500" size={24}/></div>
                  ) : savedVouchers.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-400">
                      <Ticket size={32} className="mx-auto mb-2 text-gray-300"/>
                      Ví voucher trống. Hãy ghé shop để lưu mã giảm giá!
                    </div>
                  ) : (
                    <div className="divide-y divide-orange-100 max-h-60 overflow-y-auto">
                      {savedVouchers.map((sv: any) => {
                        const v = sv.voucher || sv;
                        const canUse = !sv.is_used && v.valid_to && new Date(v.valid_to) >= new Date() && totalPrice >= (v.min_order_value ?? 0);
                        return (
                          <button key={sv.id || v.id}
                            onClick={() => canUse && handlePickVoucher(v.code)}
                            disabled={!canUse}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                              canUse ? 'hover:bg-orange-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className={`flex-shrink-0 w-14 h-14 rounded-lg flex flex-col items-center justify-center text-white text-xs font-black ${canUse ? 'bg-orange-500' : 'bg-gray-400'}`}>
                              <span className="text-base leading-none">
                                {v.discount_type === 'PERCENT' ? `${v.discount_value}%` : `${(v.discount_value/1000).toFixed(0)}K`}
                              </span>
                              <span className="text-[9px] opacity-80">GIẢM</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-gray-800 text-sm tracking-wider">{v.code}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {v.discount_type === 'PERCENT' ? `Giảm ${v.discount_value}% · Tối đa ${Number(v.max_discount_amount||0).toLocaleString()}đ` : `Giảm ${Number(v.discount_value).toLocaleString()}đ`}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {!canUse && sv.is_used ? '✗ Đã dùng' :
                                 !canUse && totalPrice < (v.min_order_value ?? 0) ? `✗ Cần đơn ≥ ${Number(v.min_order_value).toLocaleString()}đ` :
                                 !canUse ? '✗ Hết hạn' :
                                 `✓ Đơn tối thiểu ${Number(v.min_order_value).toLocaleString()}đ`}
                              </p>
                            </div>
                            {canUse && <ChevronRight size={16} className="text-orange-400 flex-shrink-0"/>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              <div className="px-6 py-4 border-t border-dashed border-gray-200 bg-gray-50/50 space-y-3">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Tạm tính</span>
                  <span className="font-medium text-gray-700">{totalPrice.toLocaleString()}đ</span>
                </div>
                {discountApplied && discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-500 font-semibold">Giảm giá ({discountCode})</span>
                    <span className="font-bold text-orange-500">-{discountAmount.toLocaleString()}đ</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Phí vận chuyển</span>
                  <span className="font-semibold text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded">Miễn phí</span>
                </div>
                <div className="flex justify-between items-end pt-3 border-t border-gray-200">
                  <span className="font-bold text-gray-900 text-sm">Tổng cộng</span>
                  <div className="text-right">
                    <p className="text-2xl font-black text-green-600 leading-none">
                      {finalTotal.toLocaleString()}đ
                    </p>
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
          fullName={fullName}
          phoneNumber={phoneNumber}
          address={address}
          paymentMethod={paymentMethods.find(m => m.id === paymentMethod)!}
          totalPrice={totalPrice}
          discountAmount={discountAmount}
          finalTotal={finalTotal}
          discountCode={discountApplied ? discountCode : ''}
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
  items, fullName, phoneNumber, address,
  paymentMethod, totalPrice, discountAmount, finalTotal, discountCode, loading,
  onClose, onConfirm
}: {
  items: any[];
  fullName: string;
  phoneNumber: string;
  address: string;
  paymentMethod: { id: string; title: string; sub: string; icon: React.ReactNode };
  totalPrice: number;
  discountAmount: number;
  finalTotal: number;
  discountCode: string;
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
          <div className="bg-gray-900 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">Tổng thanh toán</p>
                {discountAmount > 0 && (
                  <p className="text-sm text-gray-400 line-through mt-0.5">{totalPrice.toLocaleString()}đ</p>
                )}
                <p className="text-2xl font-black text-green-400 mt-0.5">
                  {finalTotal.toLocaleString()}đ
                </p>
                {discountCode && (
                  <p className="text-xs text-orange-400 mt-1">Mã giảm: {discountCode} — -{discountAmount.toLocaleString()}đ</p>
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
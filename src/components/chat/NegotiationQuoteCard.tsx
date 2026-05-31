'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, ClipboardList, Wallet, Banknote, Loader2, X, Info, ArrowRight, Package, MapPin, ReceiptText, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { QuoteData } from '@/types/chat';
import { formatCurrency } from '@/utils/vi';
import api from '@/lib/axios';
import QRCode from 'react-qr-code';
import { OrderTimeline } from '../ui/OrderTimeline';
import { formatOrderStatus } from '@/utils/vi';
import { io } from 'socket.io-client';

type CheckoutStep = 'PRESHOW' | 'PAYMENT' | 'SUCCESS';

type CheckoutOrderData = {
  quoteId?: string;
  orderId?: string;
  checkoutSessionId?: string;
  totalAmount?: number;
  paymentMethod?: 'COD' | 'MOMO';
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
};

type CurrentUser = {
  id: string;
  is_buyer: boolean;
  is_seller: boolean;
};

const isHttpImageUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\//i.test(value);

const formatOrderStatusLabel = (status: string): string => {
  return formatOrderStatus(status);
};

// Thông tin Order do BE tạo ngay khi buyer ACCEPT báo giá (gửi qua WS event
// `quoteAccepted`). Nếu có → card show payment selector inline thay vì
// chỉ một badge tĩnh.
export interface QuoteOrderInfo {
  orderId:            string;
  checkoutSessionId:  string;
  totalAmount:        number;
  awaitsPaymentSelection?: boolean;
  /** Phương thức đã được chọn (sau khi click) — null khi chưa chọn */
  selectedMethod?:    'COD' | 'MOMO' | null;
  /** WS `orderStatusUpdated` cập nhật khi MoMo IPN flip session PAID. */
  paymentStatus?:     'UNPAID' | 'PAID' | 'FAILED' | null;
  orderStatus?:       'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'COMPLETED' | string | null;
}

interface Props {
  quote:     QuoteData;
  /** true = người xem là buyer (có nút Accept/Reject + payment selector) */
  isBuyer:   boolean;
  onAccept?: () => void;
  onReject?: () => void;
  /** Có khi quote.status === 'ACCEPTED' và BE đã tạo Order */
  orderInfo?: QuoteOrderInfo;
  /** Callback khi buyer chọn payment method — parent gọi API select-payment */
  onSelectPayment?: (method: 'COD' | 'MOMO') => void;
  /** Đang gọi API select-payment (disable button + spinner) */
  paymentLoading?: boolean;
  /** Current user info for role-based actions */
  currentUser?: CurrentUser;
}

export const NegotiationQuoteCard = ({
  quote,
  isBuyer,
  onAccept,
  onReject,
  orderInfo,
  onSelectPayment,
  paymentLoading,
  currentUser,
}: Props) => {
  const [showPaymentPopover, setShowPaymentPopover] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('PRESHOW');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'MOMO'>('COD');
  const [submittingCheckout, setSubmittingCheckout] = useState(false);
  const [localQuoteStatus, setLocalQuoteStatus] = useState<QuoteData['status'] | null>(null);
  const [chosenPaymentMethod, setChosenPaymentMethod] = useState<'COD' | 'MOMO' | null>(null);
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [checkoutNote, setCheckoutNote] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<CheckoutOrderData | null>(null);
  const [liveOrderStatus, setLiveOrderStatus] = useState<string | null>(orderInfo?.orderStatus ?? null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (quote.status !== 'PENDING') {
      console.log('[NegotiationQuoteCard] Quote status changed:', quote.status);
      setLocalQuoteStatus(quote.status);
    }
  }, [quote.status]);

  useEffect(() => {
    console.log('[NegotiationQuoteCard] Component mounted. orderInfo:', orderInfo);
    console.log('[NegotiationQuoteCard] Initial liveOrderStatus:', orderInfo?.orderStatus);
    console.log('[NegotiationQuoteCard] Quote status:', quote.status);
    console.log('[NegotiationQuoteCard] IsBuyer:', isBuyer);
  }, []);

  useEffect(() => {
    console.log('[NegotiationQuoteCard] liveOrderStatus changed:', liveOrderStatus);
  }, [liveOrderStatus]);

  // Listen to order status updates from backend via socket
  useEffect(() => {
    if (!orderInfo?.orderId) {
      console.log('[NegotiationQuoteCard] Socket listener skipped: no orderInfo.orderId');
      return;
    }

    console.log('[NegotiationQuoteCard] 🔌 Initializing socket listener for orderInfo.orderId:', orderInfo.orderId);

    const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    if (!token) {
      console.warn('[NegotiationQuoteCard] ❌ No access token found in localStorage');
      return;
    }

    console.log('[NegotiationQuoteCard] 📡 Connecting to Socket.io at:', SOCKET_URL);

    const socket = io(SOCKET_URL, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket'],
      reconnection: true,
    });

    socket.on('connect', () => {
      console.log('[NegotiationQuoteCard] ✅ Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[NegotiationQuoteCard] 🔌 Socket disconnected. Reason:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[NegotiationQuoteCard] ❌ Socket connection error:', error);
    });

    socket.on('orderStatusUpdated', (payload: any) => {
      console.log('[NegotiationQuoteCard] 📦 Received orderStatusUpdated event:', payload);
      console.log('[NegotiationQuoteCard] Checking match: payload.orderId =', payload.orderId, ' vs orderInfo.orderId =', orderInfo.orderId);

      if (payload.orderId === orderInfo.orderId) {
        console.log('[NegotiationQuoteCard] ✅ ORDER MATCH! Updating liveOrderStatus to:', payload.newStatus);
        setLiveOrderStatus(payload.newStatus);
      } else {
        console.log('[NegotiationQuoteCard] ⚠️ Order ID mismatch. Ignoring this event.');
      }
    });

    return () => {
      console.log('[NegotiationQuoteCard] 🧹 Cleaning up socket listener');
      socket.disconnect();
    };
  }, [orderInfo?.orderId]);

  useEffect(() => {
    if (!showPaymentPopover) return;
    setSubmitError(null);
    if (checkoutStep === 'PRESHOW') {
      setShippingPhone('');
      setShippingAddress('');
      setCheckoutNote('');
      setPaymentMethod('COD');
      setCheckoutOrder(null);
    }
  }, [showPaymentPopover, checkoutStep]);

  // Action handlers for order status updates
  const handleConfirmOrder = async () => {
    if (!orderInfo?.orderId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post(`/orders/${orderInfo.orderId}/confirm`);
      console.log('[NegotiationQuoteCard] Order confirmed successfully');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Không thể xác nhận đơn hàng.';
      setActionError(typeof message === 'string' ? message : 'Không thể xác nhận đơn hàng.');
      console.error('[NegotiationQuoteCard] Confirm order error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleShipOrder = async () => {
    if (!orderInfo?.orderId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post(`/orders/${orderInfo.orderId}/ship`);
      console.log('[NegotiationQuoteCard] Order shipped successfully');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Không thể giao hàng.';
      setActionError(typeof message === 'string' ? message : 'Không thể giao hàng.');
      console.error('[NegotiationQuoteCard] Ship order error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!orderInfo?.orderId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post(`/orders/${orderInfo.orderId}/complete`);
      console.log('[NegotiationQuoteCard] Order completed successfully');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Không thể hoàn tất đơn hàng.';
      setActionError(typeof message === 'string' ? message : 'Không thể hoàn tất đơn hàng.');
      console.error('[NegotiationQuoteCard] Complete order error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const effectiveStatus = localQuoteStatus ?? quote.status;
  const total = quote.price * quote.quantity;
  const canContinueToPayment = shippingPhone.trim() && shippingAddress.trim();
  const canConfirmCheckout = !submittingCheckout && shippingPhone.trim() && shippingAddress.trim();

  const handleOpenPaymentPopover = () => {
    if (effectiveStatus !== 'PENDING' || !isBuyer) return;
    setSubmitError(null);
    setShowPaymentPopover(true);
    setCheckoutStep('PRESHOW');
    setCheckoutOrder(null);
  };

  const buildCheckoutPayload = () => {
    const payload: Record<string, any> = {
      quoteId: quote.messageId,
      paymentMethod,
      shippingAddress: shippingAddress.trim(),
      phoneNumber: shippingPhone.trim(),
    };
    if (checkoutNote.trim()) {
      payload.note = checkoutNote.trim();
    }
    return payload;
  };

  const handleGoToPayment = () => {
    setSubmitError(null);
    if (!shippingPhone.trim() || !shippingAddress.trim()) {
      setSubmitError('Vui lòng nhập số điện thoại và địa chỉ giao hàng.');
      return;
    }
    setCheckoutStep('PAYMENT');
  };

  const handleConfirmPayment = async () => {
    if (!isBuyer || effectiveStatus !== 'PENDING' || checkoutStep !== 'PAYMENT') return;
    setSubmittingCheckout(true);
    setSubmitError(null);
    try {
      const payload = buildCheckoutPayload();
      const { data: responseData } = await api.post('/orders/checkout-quote', payload, {
        timeout: 30000,
      });

      setChosenPaymentMethod(paymentMethod);
      setLocalQuoteStatus('ACCEPTED');
      setCheckoutOrder({
        quoteId: quote.messageId,
        orderId: responseData.orderId,
        checkoutSessionId: responseData.checkoutSessionId,
        totalAmount: responseData.totalAmount ?? total,
        paymentMethod,
        payUrl: responseData.payUrl,
        deeplink: responseData.deeplink,
        qrCodeUrl: responseData.qrCodeUrl,
      });

      if (paymentMethod === 'MOMO') {
        if (!responseData?.payUrl) {
          setSubmitError('MoMo chưa trả về payUrl. Vui lòng thử lại.');
          return;
        }
        window.location.href = responseData.payUrl;
        return;
      }

      setCheckoutStep('SUCCESS');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Không thể tạo đơn từ báo giá này.';
      setSubmitError(typeof message === 'string' ? message : 'Không thể tạo đơn từ báo giá này.');
    } finally {
      setSubmittingCheckout(false);
    }
  };

  return (
    <div className="bg-white border border-green-200 rounded-2xl p-4 shadow-sm w-full max-w-[320px]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
        <ClipboardList size={16} className="text-green-600" />
        <span className="text-sm font-bold text-gray-800">📋 Báo giá từ người bán</span>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-sm text-gray-700 mb-3">
        <div className="flex justify-between">
          <span className="text-gray-500">Sản phẩm:</span>
          <span className="font-semibold">{quote.productName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Số lượng:</span>
          <span className="font-semibold">{quote.quantity} {quote.unit}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Giá đề xuất:</span>
          <span className="font-bold text-green-600">
            {formatCurrency(quote.price)}/{quote.unit}
          </span>
        </div>
        <div className="flex justify-between border-t border-gray-100 pt-2 mt-1">
          <span className="text-gray-500 font-medium">Tổng cộng:</span>
          <span className="font-bold text-green-700 text-base">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Actions / Status */}
      {effectiveStatus === 'PENDING' && isBuyer && (
        <div className="flex gap-2">
          <button
            onClick={handleOpenPaymentPopover}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
          >
            <CheckCircle2 size={15} /> Chấp nhận &amp; Đặt hàng
          </button>
          <button
            onClick={onReject}
            className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-2.5 rounded-xl text-sm font-bold transition"
          >
            <XCircle size={15} /> Từ chối
          </button>
        </div>
      )}

      {effectiveStatus === 'PENDING' && !isBuyer && (
        <div className="bg-yellow-50 text-yellow-700 px-3 py-2 rounded-xl text-sm font-medium border border-yellow-100 text-center">
          ⏳ Đang chờ người mua phản hồi...
        </div>
      )}

      {effectiveStatus === 'ACCEPTED' && (
        <div className="space-y-2.5">
          {/* Live Order Tracker — when orderInfo exists */}
          {orderInfo && liveOrderStatus && (
            <div className="space-y-2.5">
              {console.log('[NegotiationQuoteCard] Rendering Live Order Tracker. orderInfo.orderId:', orderInfo.orderId, 'liveOrderStatus:', liveOrderStatus)}
              {/* Status Badge */}
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2.5 rounded-xl text-xs font-bold border border-blue-200">
                <Package size={15} />
                <span>Đơn hàng: {formatOrderStatusLabel(liveOrderStatus)}</span>
                <span className="ml-auto text-[10px] font-semibold text-blue-600/80 tracking-wide">
                  #{orderInfo.orderId.slice(-6).toUpperCase()}
                </span>
              </div>

              {/* Mini Order Timeline (Compact) */}
              <div className="bg-white border border-gray-100 rounded-xl p-2">
                <OrderTimeline currentStatus={liveOrderStatus} compact={true} />
              </div>

              {/* Action Buttons - Role Based */}
              {currentUser && (
                <div className="space-y-2">
                  {/* Seller Actions */}
                  {currentUser.is_seller && (
                    <>
                      {liveOrderStatus === 'PENDING' && (
                        <button
                          onClick={handleConfirmOrder}
                          disabled={actionLoading}
                          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-wait text-white py-2 rounded-xl text-sm font-bold transition"
                        >
                          {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Xác nhận đơn
                        </button>
                      )}
                      {liveOrderStatus === 'CONFIRMED' && (
                        <button
                          onClick={handleShipOrder}
                          disabled={actionLoading}
                          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-wait text-white py-2 rounded-xl text-sm font-bold transition"
                        >
                          {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
                          Giao hàng
                        </button>
                      )}
                    </>
                  )}

                  {/* Buyer Actions */}
                  {currentUser.is_buyer && (
                    <>
                      {liveOrderStatus === 'SHIPPING' && (
                        <button
                          onClick={handleCompleteOrder}
                          disabled={actionLoading}
                          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-wait text-white py-2 rounded-xl text-sm font-bold transition"
                        >
                          {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Đã nhận được hàng
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Action Error */}
              {actionError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {actionError}
                </div>
              )}
            </div>
          )}

          {/* Static accepted badge — fallback if no orderInfo yet (race condition) */}
          {!orderInfo && (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-xl text-xs font-bold border border-green-200">
              {console.log('[NegotiationQuoteCard] Rendering static ACCEPTED badge (no orderInfo yet)')}
              <CheckCircle2 size={15} />
              <span>Đã chấp nhận</span>
            </div>
          )}

          {isBuyer && chosenPaymentMethod && !orderInfo && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 flex items-center gap-2">
              <Info size={14} className="text-gray-400" />
              {chosenPaymentMethod === 'COD' ? 'Đã đặt COD, seller sẽ xác nhận đơn trong chat.' : 'Đã xác nhận MoMo, đang chuyển hướng thanh toán.'}
            </div>
          )}

          {/* Pay Now selector — chỉ hiện cho buyer + khi BE đã tạo Order + chưa chọn method */}
          {isBuyer && orderInfo?.awaitsPaymentSelection && !orderInfo.selectedMethod && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
              <div className="text-[11px] font-bold text-amber-800 mb-2 uppercase tracking-wide">
                Chọn phương thức thanh toán
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectPayment?.('MOMO')}
                  disabled={paymentLoading}
                  className="flex items-center justify-center gap-1.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-60 disabled:cursor-wait text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {paymentLoading ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
                  Trả qua MoMo
                </button>
                <button
                  type="button"
                  onClick={() => onSelectPayment?.('COD')}
                  disabled={paymentLoading}
                  className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-wait text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {paymentLoading ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />}
                  COD
                </button>
              </div>
            </div>
          )}

          {/* Trạng thái sau khi chọn method — ưu tiên paymentStatus từ WS update
              (MoMo IPN flip CONFIRMED) > selectedMethod local optimistic. */}
          {isBuyer && orderInfo?.paymentStatus === 'PAID' && (
            <div className="bg-green-100 border border-green-300 rounded-xl px-3 py-2 text-xs font-bold text-green-800 flex items-center gap-2">
              <CheckCircle2 size={14} /> Đã thanh toán &amp; xác nhận đơn hàng
            </div>
          )}
          {isBuyer && orderInfo?.paymentStatus !== 'PAID' && orderInfo?.selectedMethod === 'COD' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700 flex items-center gap-2">
              <Banknote size={14} /> Đã đặt COD — chờ seller xác nhận
            </div>
          )}
          {isBuyer && orderInfo?.paymentStatus !== 'PAID' && orderInfo?.selectedMethod === 'MOMO' && (
            <div className="bg-pink-50 border border-pink-200 rounded-xl px-3 py-2 text-xs font-semibold text-pink-700 flex items-center gap-2">
              <Wallet size={14} /> Đang chuyển sang MoMo...
            </div>
          )}
        </div>
      )}

      {effectiveStatus === 'REJECTED' && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-xl text-sm font-bold border border-red-100">
          <XCircle size={15} /> Đã từ chối
        </div>
      )}

      {effectiveStatus === 'EXPIRED' && (
        <div className="bg-gray-50 text-gray-500 px-3 py-2 rounded-xl text-sm font-bold border border-gray-200 text-center">
          ⌛ Đã hết hạn
        </div>
      )}

      {showPaymentPopover && isBuyer && effectiveStatus === 'PENDING' && (
        <div className="fixed inset-0 z-[60] bg-black/40 px-4 py-6 flex items-end sm:items-center justify-center" onClick={(e) => {
          if (e.target === e.currentTarget && !submittingCheckout) setShowPaymentPopover(false);
        }}>
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[70vh]">
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-orange-500 font-bold">Thanh toán trong chat</p>
                <h3 className="text-lg font-black text-gray-900 mt-0.5">
                  {checkoutStep === 'PRESHOW' && 'Rà soát đơn hàng'}
                  {checkoutStep === 'PAYMENT' && 'Chọn phương thức thanh toán'}
                  {checkoutStep === 'SUCCESS' && 'Đặt hàng thành công'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !submittingCheckout && setShowPaymentPopover(false)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
              {checkoutStep === 'PRESHOW' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-orange-700">
                      <ReceiptText size={16} /> Thông tin chốt đơn
                    </div>
                    <div className="grid grid-cols-1 gap-3 text-sm text-gray-700">
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-gray-500 flex items-center gap-2"><Package size={14} /> Sản phẩm</span>
                        <span className="font-semibold text-right">{quote.productName}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-gray-500">Số lượng</span>
                        <span className="font-semibold text-right">{quote.quantity} {quote.unit}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-gray-500">Đơn giá</span>
                        <span className="font-semibold text-right text-orange-700">{formatCurrency(quote.price)}/{quote.unit}</span>
                      </div>
                      <div className="border-t border-orange-100 pt-3 flex items-start justify-between gap-4">
                        <span className="text-gray-500 font-medium">Tổng tiền</span>
                        <span className="font-black text-orange-700 text-base text-right">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                      <MapPin size={16} /> Thông tin giao hàng
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-1.5">Số điện thoại</label>
                      <input
                        type="tel"
                        value={shippingPhone}
                        onChange={(e) => setShippingPhone(e.target.value)}
                        placeholder="Nhập số điện thoại nhận hàng"
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-1.5">Địa chỉ giao hàng</label>
                      <textarea
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        placeholder="Nhập địa chỉ giao hàng"
                        rows={3}
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-1.5">Ghi chú</label>
                      <textarea
                        value={checkoutNote}
                        onChange={(e) => setCheckoutNote(e.target.value)}
                        placeholder="Ví dụ: gọi trước khi giao, giao giờ hành chính..."
                        rows={2}
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10 resize-none"
                      />
                    </div>
                  </div>

                  {submitError && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      {submitError}
                    </div>
                  )}
                </div>
              )}

              {checkoutStep === 'PAYMENT' && (
                <div className="space-y-4">
                  {checkoutOrder?.paymentMethod === 'MOMO' && (
                    <div className="space-y-4 rounded-2xl border border-pink-100 bg-pink-50 p-4">
                      <div className="text-center">
                        <p className="text-xs font-semibold uppercase tracking-wide text-pink-700">Thanh toán MoMo</p>
                        <p className="text-2xl font-black text-pink-600 mt-1">{formatCurrency(checkoutOrder?.totalAmount ?? total)}</p>
                        <p className="mt-1 text-xs text-gray-600">Quét mã QR để hoàn tất thanh toán.</p>
                      </div>

                      <div className="flex justify-center">
                        {isHttpImageUrl(checkoutOrder?.qrCodeUrl) ? (
                          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                            <Image src={checkoutOrder.qrCodeUrl} alt="MoMo QR" width={240} height={240} unoptimized />
                          </div>
                        ) : (checkoutOrder?.qrCodeUrl ?? checkoutOrder?.deeplink ?? checkoutOrder?.payUrl) ? (
                          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                            <QRCode
                              value={(checkoutOrder.qrCodeUrl ?? checkoutOrder.deeplink ?? checkoutOrder.payUrl) as string}
                              size={240}
                              level="M"
                            />
                          </div>
                        ) : (
                          <div className="py-10 text-sm italic text-gray-500">Không nhận được QR từ MoMo.</div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600 break-all">
                        <div className="font-semibold text-gray-700 mb-1">Liên kết dự phòng</div>
                        {checkoutOrder.deeplink || checkoutOrder.payUrl || 'Không có liên kết thanh toán.'}
                      </div>

                      {(checkoutOrder.payUrl || checkoutOrder.deeplink) && (
                        <button
                          type="button"
                          onClick={() => {
                            const momoUrl = checkoutOrder.payUrl || checkoutOrder.deeplink;
                            if (momoUrl) window.location.href = momoUrl;
                          }}
                          className="w-full rounded-2xl bg-pink-600 py-3 text-sm font-black text-white hover:bg-pink-700 flex items-center justify-center gap-2"
                        >
                          <ExternalLink size={16} /> Mở MoMo
                        </button>
                      )}
                    </div>
                  )}

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                      <ReceiptText size={16} /> Review đơn hàng
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
                      <div className="flex justify-between gap-4"><span className="text-gray-500">Sản phẩm</span><span className="font-semibold text-right">{quote.productName}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-gray-500">Số lượng</span><span className="font-semibold text-right">{quote.quantity} {quote.unit}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-gray-500">Địa chỉ</span><span className="font-semibold text-right max-w-[60%]">{shippingAddress}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-gray-500">SĐT</span><span className="font-semibold text-right">{shippingPhone}</span></div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-gray-800 mb-2">Chọn phương thức thanh toán</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('COD')}
                        className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-bold transition ${paymentMethod === 'COD' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                      >
                        <Banknote size={16} /> COD
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('MOMO')}
                        className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-bold transition ${paymentMethod === 'MOMO' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                      >
                        <Wallet size={16} /> MoMo
                      </button>
                    </div>
                  </div>

                  {submitError && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      {submitError}
                    </div>
                  )}
                </div>
              )}

              {checkoutStep === 'SUCCESS' && (
                <div className="space-y-4 text-center">
                  <div className="rounded-3xl border border-green-100 bg-green-50 p-6 space-y-3">
                    <div className="mx-auto h-14 w-14 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <CheckCircle2 size={30} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-green-700">Đặt hàng thành công!</h4>
                      <p className="text-sm text-gray-600 mt-1">Shop sẽ sớm chuẩn bị hàng cho bạn.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 text-sm text-gray-700 text-left">
                    <div className="flex justify-between gap-4"><span className="text-gray-500">Mã đơn</span><span className="font-semibold text-right">{checkoutOrder?.orderId ?? '—'}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-gray-500">Tổng tiền</span><span className="font-black text-green-700 text-right">{formatCurrency(checkoutOrder?.totalAmount ?? total)}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-gray-500">Phương thức</span><span className="font-semibold text-right">{checkoutOrder?.paymentMethod ?? paymentMethod}</span></div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 bg-white px-5 py-4 sticky bottom-0">
              {checkoutStep === 'PRESHOW' && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentPopover(false);
                      setCheckoutOrder(null);
                    }}
                    className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleGoToPayment}
                    disabled={!canContinueToPayment}
                    className="flex-1 rounded-2xl bg-green-600 py-3 text-sm font-black text-white hover:bg-green-700 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    <ArrowRight size={16} /> Tiếp tục thanh toán
                  </button>
                </div>
              )}

              {checkoutStep === 'PAYMENT' && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('PRESHOW')}
                    className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={!canConfirmCheckout}
                    className="flex-1 rounded-2xl bg-green-600 py-3 text-sm font-black text-white hover:bg-green-700 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {submittingCheckout ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Xác nhận đặt hàng
                  </button>
                </div>
              )}

              {checkoutStep === 'SUCCESS' && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentPopover(false);
                    setCheckoutStep('PRESHOW');
                    setCheckoutOrder(null);
                    setSubmitError(null);
                    setPaymentMethod('COD');
                  }}
                  className="w-full rounded-2xl bg-green-600 py-3 text-sm font-black text-white hover:bg-green-700"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

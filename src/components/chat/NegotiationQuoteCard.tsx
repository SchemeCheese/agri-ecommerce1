'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Wallet, Banknote, Loader2, Info, ArrowRight, Package, MapPin, ReceiptText, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { QuoteData } from '@/types/chat';
import { formatCurrency } from '@/utils/vi';
import api from '@/lib/axios';
import QRCode from 'react-qr-code';
import { OrderTimeline } from '../ui/OrderTimeline';
import { formatOrderStatus } from '@/utils/vi';
import { SellerOrderActionsCard } from './SellerOrderActionsCard';
import { BuyerOrderActionsCard } from './BuyerOrderActionsCard';
import { io } from 'socket.io-client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

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

// Báo giá có hiệu lực 24h kể từ lúc seller gửi — khớp QUOTE_EXPIRY_MS phía BE
// (negotiation.service / checkout-quote). FE chỉ disable UI; BE là nguồn chặn thật.
const QUOTE_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Các trạng thái Order CÒN hành động khả dụng (seller: confirm/ship/confirm-lost/cancel;
// buyer: complete/report). Mọi trạng thái khác là terminal → ẩn toàn bộ nút thao tác,
// chỉ hiển thị badge read-only. Guard này là "strict allow-list": an toàn kể cả khi
// một sub-card quên tự return null.
const ACTIONABLE_ORDER_STATUSES = new Set(['PENDING', 'CONFIRMED', 'SHIPPING', 'ISSUE_REPORTED']);
const isOrderActionable = (status: string | null | undefined): boolean =>
  !!status && ACTIONABLE_ORDER_STATUSES.has(status);

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
  const effectiveStatus = localQuoteStatus ?? quote.status;
  // Hết hạn chỉ có ý nghĩa khi quote còn PENDING — quote đã ACCEPTED/REJECTED
  // giữ nguyên trạng thái cũ. Thiếu createdAt (message rất cũ) → coi như còn hạn,
  // BE vẫn chặn nếu thật sự quá 24h.
  const isExpired =
    effectiveStatus === 'PENDING' &&
    !!quote.createdAt &&
    Date.now() - new Date(quote.createdAt).getTime() > QUOTE_EXPIRY_MS;
  const total = quote.price * quote.quantity;
  const canContinueToPayment = shippingPhone.trim() && shippingAddress.trim();
  const canConfirmCheckout = !submittingCheckout && shippingPhone.trim() && shippingAddress.trim();

  const handleOpenPaymentPopover = () => {
    if (effectiveStatus !== 'PENDING' || !isBuyer || isExpired) return;
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
    <div className="bg-white border border-green-200 rounded-2xl p-3 shadow-sm w-full">
      {/* Status Badge Header */}
      {effectiveStatus === 'PENDING' && (
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Báo giá từ seller</span>
          {isExpired ? (
            <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-[10px] font-bold">Hết hạn</span>
          ) : (
            <span className="inline-block bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg text-[10px] font-bold">Chờ phản hồi</span>
          )}
        </div>
      )}

      {effectiveStatus === 'ACCEPTED' && (
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Đơn hàng</span>
          <span className="inline-block bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[10px] font-bold">Đã chấp nhận</span>
        </div>
      )}

      {effectiveStatus === 'REJECTED' && (
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Báo giá</span>
          <span className="inline-block bg-red-100 text-red-700 px-2 py-1 rounded-lg text-[10px] font-bold">Đã từ chối</span>
        </div>
      )}

      {effectiveStatus === 'EXPIRED' && (
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Báo giá</span>
          <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-[10px] font-bold">Hết hạn</span>
        </div>
      )}

      {/* Compact Body */}
      <div className="space-y-1 text-xs text-gray-700 mb-2">
        <div className="flex justify-between gap-2">
          <span className="text-gray-500 flex-shrink-0">Sản phẩm:</span>
          <span className="font-semibold truncate max-w-[180px]">{quote.productName}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-500 flex-shrink-0">Số lượng:</span>
          <span className="font-semibold">{quote.quantity} {quote.unit}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-500 flex-shrink-0">Đơn giá:</span>
          <span className="font-bold text-green-600">{formatCurrency(quote.price)}/{quote.unit}</span>
        </div>
        <div className="flex justify-between gap-2 border-t border-gray-100 pt-1 mt-0.5">
          <span className="text-gray-600 font-medium flex-shrink-0">Tổng:</span>
          <span className="font-bold text-green-700">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Actions / Status for PENDING */}
      {effectiveStatus === 'PENDING' && isBuyer && (
        <div className="space-y-1.5">
          {isExpired && (
            <div className="text-center text-xs font-semibold text-gray-600 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200">
              ⌛ Báo giá đã hết hạn (quá 24 giờ). Hãy nhắn seller gửi báo giá mới.
            </div>
          )}
          <div className="flex gap-2 text-xs">
            <button
              onClick={handleOpenPaymentPopover}
              disabled={isExpired}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg font-bold transition ${
                isExpired
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <CheckCircle2 size={14} /> Chấp nhận
            </button>
            <button
              onClick={onReject}
              className="flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2 py-2 rounded-lg font-bold transition"
            >
              <XCircle size={14} /> Từ chối
            </button>
          </div>
        </div>
      )}

      {effectiveStatus === 'PENDING' && !isBuyer && (
        isExpired ? (
          <div className="text-center text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200">
            ⌛ Báo giá đã hết hạn — người mua không thể chấp nhận nữa
          </div>
        ) : (
          <div className="text-center text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-1.5 rounded-lg border border-yellow-100">
            ⏳ Chờ phản hồi từ người mua
          </div>
        )
      )}

      {/* ACCEPTED state: Order Tracking + Actions */}
      {effectiveStatus === 'ACCEPTED' && (
        <div className="space-y-1.5">
          {orderInfo && liveOrderStatus && (
            <>
              {/* Status Badge with Order ID */}
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-2 py-1.5 rounded-lg text-xs font-bold border border-blue-200">
                <Package size={13} />
                <span className="flex-1">{formatOrderStatusLabel(liveOrderStatus)}</span>
                <span className="text-[9px] font-semibold text-blue-600/80">#{orderInfo.orderId.slice(-6).toUpperCase()}</span>
              </div>

              {/* Compact Timeline */}
              <div className="bg-white border border-gray-100 rounded-lg p-1.5">
                <OrderTimeline currentStatus={liveOrderStatus} compact={true} />
              </div>

              {/* Action Buttons — STRICT GUARD: chỉ render khi đơn còn trạng thái
                  có hành động (PENDING/CONFIRMED/SHIPPING/ISSUE_REPORTED). Khi đơn
                  đã chốt (COMPLETED/CANCELLED/FAILED/REFUNDED/RETURNED/REFUND_PENDING)
                  → ẩn hoàn toàn nút, tránh thao tác lên đơn đã kết thúc. */}
              {currentUser && isOrderActionable(liveOrderStatus) && (
                <>
                  {currentUser.is_seller && (
                    <SellerOrderActionsCard
                      orderId={orderInfo.orderId}
                      currentStatus={liveOrderStatus}
                    />
                  )}
                  {currentUser.is_buyer && (
                    <BuyerOrderActionsCard
                      orderId={orderInfo.orderId}
                      currentStatus={liveOrderStatus}
                    />
                  )}
                </>
              )}

              {/* Completed Badge (read-only) */}
              {liveOrderStatus === 'COMPLETED' && (
                <div className="text-center text-xs font-semibold text-green-700 bg-green-50 px-2 py-1.5 rounded-lg border border-green-200">
                  ✅ Đơn hàng đã hoàn thành
                </div>
              )}

              {/* Payment Status Messages */}
              {isBuyer && orderInfo?.paymentStatus === 'PAID' && (
                <div className="text-center text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                  ✓ Đã thanh toán
                </div>
              )}
              {isBuyer && orderInfo?.selectedMethod === 'COD' && orderInfo?.paymentStatus !== 'PAID' && (
                <div className="text-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                  Đặt COD - chờ xác nhận
                </div>
              )}
            </>
          )}

          {!orderInfo && (
            <div className="text-center text-xs font-semibold text-green-700 bg-green-50 px-2 py-1.5 rounded-lg border border-green-200">
              ✓ Đã chấp nhận
            </div>
          )}
        </div>
      )}

      {effectiveStatus === 'REJECTED' && (
        <div className="text-center text-xs font-semibold text-red-700 bg-red-50 px-2 py-1.5 rounded-lg border border-red-200">
          ✗ Đã từ chối
        </div>
      )}

      {effectiveStatus === 'EXPIRED' && (
        <div className="text-center text-xs font-semibold text-gray-600 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200">
          ⌛ Hết hạn
        </div>
      )}

      {/* Checkout Dialog (unchanged) */}
      <Dialog
        open={showPaymentPopover && isBuyer && effectiveStatus === 'PENDING'}
        onOpenChange={(open) => { if (!open && !submittingCheckout) setShowPaymentPopover(false); }}
      >
        <DialogContent className="p-0 gap-0 max-w-md max-h-[80vh] overflow-hidden flex flex-col rounded-3xl">
          <div className="w-full bg-white overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-orange-500 font-bold">Thanh toán trong chat</p>
                <DialogTitle className="text-lg font-black text-gray-900 mt-0.5">
                  {checkoutStep === 'PRESHOW' && 'Rà soát đơn hàng'}
                  {checkoutStep === 'PAYMENT' && 'Chọn phương thức thanh toán'}
                  {checkoutStep === 'SUCCESS' && 'Đặt hàng thành công'}
                </DialogTitle>
              </div>
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
        </DialogContent>
      </Dialog>
    </div>
  );
};

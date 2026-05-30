'use client';

import React from 'react';
import { CheckCircle2, XCircle, ClipboardList, Wallet, Banknote, Loader2 } from 'lucide-react';
import { QuoteData } from '@/types/chat';
import { formatCurrency } from '@/utils/vi';

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
}

export const NegotiationQuoteCard = ({
  quote,
  isBuyer,
  onAccept,
  onReject,
  orderInfo,
  onSelectPayment,
  paymentLoading,
}: Props) => {
  const total = quote.price * quote.quantity;

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
      {quote.status === 'PENDING' && isBuyer && (
        <div className="flex gap-2">
          <button
            onClick={onAccept}
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

      {quote.status === 'PENDING' && !isBuyer && (
        <div className="bg-yellow-50 text-yellow-700 px-3 py-2 rounded-xl text-sm font-medium border border-yellow-100 text-center">
          ⏳ Đang chờ người mua phản hồi...
        </div>
      )}

      {quote.status === 'ACCEPTED' && (
        <div className="space-y-2.5">
          {/* Status badge — luôn hiển thị, kể cả khi chưa có orderInfo (legacy / race) */}
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-xl text-xs font-bold border border-green-200">
            <CheckCircle2 size={15} />
            <span>Đã chấp nhận</span>
            {orderInfo && (
              <span className="ml-auto text-[10px] font-semibold text-green-600/80 tracking-wide">
                #{orderInfo.orderId.slice(-6).toUpperCase()}
              </span>
            )}
          </div>

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

      {quote.status === 'REJECTED' && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-xl text-sm font-bold border border-red-100">
          <XCircle size={15} /> Đã từ chối
        </div>
      )}

      {quote.status === 'EXPIRED' && (
        <div className="bg-gray-50 text-gray-500 px-3 py-2 rounded-xl text-sm font-bold border border-gray-200 text-center">
          ⌛ Đã hết hạn
        </div>
      )}
    </div>
  );
};

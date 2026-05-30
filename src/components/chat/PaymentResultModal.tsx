'use client';

import React from 'react';
import Image from 'next/image';
import { Loader2, Wallet, ExternalLink } from 'lucide-react';
import QRCode from 'react-qr-code';

const isHttpImageUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\//i.test(value);

interface Props {
  open: boolean;
  /** Tin nhắn chính (vd "Thanh toán MoMo"). */
  message: string;
  /** Phụ đề nhỏ phía dưới (tùy chọn). */
  subMessage?: string;
  payment?: {
    amount?: number;
    payUrl?: string;
    deeplink?: string;
    qrCodeUrl?: string;
  } | null;
  onOpenPayment?: () => void;
}

/**
 * Overlay trong-chat khi buyer đang chờ payment gateway phản hồi.
 * Mục đích: giữ buyer ở lại chat window, KHÔNG navigate sang /checkout — đáp ứng
 * yêu cầu "Everything happens in the ChatPopoverWindow".
 *
 * Dùng cho MoMo: hiển thị ngay khi click MoMo, biến mất khi window.location.href
 * = payUrl (browser tự rời). Nếu vì lý do gì redirect fail → modal vẫn ở.
 */
export const PaymentResultModal = ({ open, message, subMessage, payment, onOpenPayment }: Props) => {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[150] bg-white/95 backdrop-blur-sm flex items-center justify-center px-4 py-6 animate-in fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-white border border-pink-100 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-pink-100 bg-pink-50/60 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-pink-100 flex items-center justify-center mb-3 relative">
            <Wallet size={24} className="text-pink-600" />
            {!payment?.qrCodeUrl && !payment?.deeplink && !payment?.payUrl && (
              <Loader2 size={56} className="absolute inset-0 m-auto text-pink-400 animate-spin opacity-60" />
            )}
          </div>
          <h3 className="font-black text-gray-900 text-lg">{message}</h3>
          {subMessage && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{subMessage}</p>}
        </div>

        <div className="p-5 space-y-4">
          {payment?.amount != null && (
            <div className="text-center">
              <p className="text-xs text-gray-500">Số tiền cần thanh toán</p>
              <p className="text-3xl font-black text-pink-600 mt-1">{Number(payment.amount).toLocaleString('vi-VN')} đ</p>
            </div>
          )}

          <div className="flex justify-center">
            {isHttpImageUrl(payment?.qrCodeUrl) ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
                <Image src={payment.qrCodeUrl} alt="MoMo QR" width={240} height={240} unoptimized />
              </div>
            ) : (payment?.qrCodeUrl ?? payment?.deeplink ?? payment?.payUrl) ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
                <QRCode
                  value={(payment.qrCodeUrl ?? payment.deeplink ?? payment.payUrl) as string}
                  size={240}
                  level="M"
                />
              </div>
            ) : (
              <div className="py-10 text-sm text-gray-500 italic text-center">Đang chuẩn bị mã thanh toán...</div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600 break-all">
            <div className="font-semibold text-gray-700 mb-1">Liên kết dự phòng</div>
            {payment?.deeplink || payment?.payUrl || 'Không có liên kết thanh toán.'}
          </div>

          {(payment?.payUrl || payment?.deeplink) && onOpenPayment && (
            <button
              type="button"
              onClick={onOpenPayment}
              className="w-full rounded-2xl bg-pink-600 py-3 text-sm font-black text-white hover:bg-pink-700 flex items-center justify-center gap-2"
            >
              <ExternalLink size={16} /> Mở MoMo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

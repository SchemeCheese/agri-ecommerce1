'use client';

import React from 'react';
import { Loader2, Wallet } from 'lucide-react';

interface Props {
  open: boolean;
  /** Tin nhắn chính (vd "Đang chuyển hướng sang MoMo..."). */
  message: string;
  /** Phụ đề nhỏ phía dưới (tùy chọn). */
  subMessage?: string;
}

/**
 * Overlay trong-chat khi buyer đang chờ payment gateway phản hồi.
 * Mục đích: giữ buyer ở lại chat window, KHÔNG navigate sang /checkout — đáp ứng
 * yêu cầu "Everything happens in the ChatPopoverWindow".
 *
 * Dùng cho MoMo: hiển thị ngay khi click MoMo, biến mất khi window.location.href
 * = payUrl (browser tự rời). Nếu vì lý do gì redirect fail → modal vẫn ở.
 */
export const PaymentResultModal = ({ open, message, subMessage }: Props) => {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[150] bg-white/95 backdrop-blur-sm flex items-center justify-center px-6 animate-in fade-in">
      <div className="text-center max-w-xs">
        <div className="w-16 h-16 mx-auto rounded-full bg-pink-100 flex items-center justify-center mb-4 relative">
          <Wallet size={28} className="text-pink-600" />
          <Loader2 size={64} className="absolute inset-0 m-auto text-pink-400 animate-spin opacity-60" />
        </div>
        <h3 className="font-bold text-gray-900 text-base">{message}</h3>
        {subMessage && (
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">{subMessage}</p>
        )}
      </div>
    </div>
  );
};

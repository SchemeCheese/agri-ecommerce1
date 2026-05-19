'use client';

// Landed here after BE /payments/momo/return 302'd us with resultCode != 0
// OR a non-MoMo-related failure (signature mismatch, missing orderId, etc).
// "Đồng ý" → router.replace('/profile/orders/[id]') to the awaiting-payment page
// so back-button cannot return to /checkout.

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { XCircle, ArrowRight, Home, Loader2 } from 'lucide-react';

const RESULT_CODE_HINTS: Record<string, string> = {
  '1006': 'Bạn đã từ chối thanh toán giao dịch.',
  '1005': 'Giao dịch không thành công vì URL hoặc QR Code đã hết hạn.',
  '1003': 'Giao dịch đã bị huỷ.',
  '49':   'Giao dịch không thành công vì vượt hạn mức giao dịch.',
  '99':   'Lỗi không xác định. Vui lòng thử lại sau.',
};

function FailedInner() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get('orderId') ?? '';
  const resultCode = params.get('resultCode') ?? '';
  const message = params.get('message') ?? '';
  const reason = params.get('reason') ?? '';

  const hint = RESULT_CODE_HINTS[resultCode] ?? message ?? reason ?? 'Giao dịch không hoàn tất.';

  const handleAgree = () => {
    if (orderId) {
      // router.replace so back-button doesn't bounce user to MoMo or /checkout.
      router.replace(`/profile/orders/${orderId}`);
    } else {
      router.replace('/profile?tab=orders');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-rose-50 px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
          <XCircle className="w-12 h-12 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Thanh toán không thành công</h1>
        <p className="text-sm text-gray-600 mt-2">{hint}</p>
        <p className="text-xs text-gray-400 mt-1">
          Đơn hàng của bạn vẫn được giữ ở trạng thái <b>chờ thanh toán</b> trong 24h.
          Bạn có thể thử lại hoặc đổi sang COD.
        </p>

        <div className="mt-6 space-y-2 bg-gray-50 rounded-xl p-4 text-sm text-left">
          {orderId && <Row label="Mã đơn hàng" value={orderId} />}
          {resultCode && <Row label="Mã lỗi MoMo" value={resultCode} />}
          {(message || reason) && <Row label="Chi tiết" value={message || reason} />}
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleAgree}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
          >
            Đồng ý
            <ArrowRight size={18} />
          </button>
          <Link
            href="/"
            replace
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
          >
            <Home size={18} />
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3">
    <span className="text-gray-500">{label}</span>
    <span className="text-gray-900 text-right break-all font-medium">{value}</span>
  </div>
);

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-red-600" /></div>}>
      <FailedInner />
    </Suspense>
  );
}

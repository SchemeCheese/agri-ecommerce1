'use client';

// Landed here after BE /payments/momo/return 302'd us with ?orderId=...&transId=...
// BE already flipped Order.CONFIRMED + Payment.PAID via markPaymentSucceeded
// (idempotent — IPN landing later is a no-op). We just confirm by polling once.

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Receipt, Home, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

function SuccessInner() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get('orderId') ?? '';
  const amountParam = params.get('amount') ?? '';
  const transId = params.get('transId') ?? '';

  const [loadedAmount, setLoadedAmount] = useState<number | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    api.get(`/payments/momo/status/${orderId}`)
      .then((r) => {
        if (cancelled) return;
        setLoadedAmount(r.data?.amount ?? null);
        setVerified(r.data?.paymentStatus === 'PAID');
      })
      .catch(() => { /* swallow — BE already updated, this is just confirmation */ });
    return () => { cancelled = true; };
  }, [orderId]);

  const amount = loadedAmount ?? (amountParam ? Number(amountParam) : null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Thanh toán thành công</h1>
        <p className="text-sm text-gray-500 mt-1">
          {verified
            ? 'Đơn hàng đã được xác nhận. Người bán sẽ chuẩn bị và giao hàng cho bạn.'
            : 'MoMo đã ghi nhận giao dịch. Đơn hàng đang được cập nhật...'}
        </p>

        <div className="mt-6 space-y-2 bg-gray-50 rounded-xl p-4 text-sm text-left">
          <Row label="Mã đơn hàng" value={orderId || '—'} />
          {amount != null && <Row label="Số tiền" value={`${amount.toLocaleString('vi-VN')} đ`} />}
          {transId && <Row label="Mã giao dịch MoMo" value={transId} />}
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {orderId ? (
            <button
              // router.replace so back-button doesn't return user to MoMo / checkout
              onClick={() => router.replace(`/profile/orders/${orderId}`)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition"
            >
              <Receipt size={18} />
              Xem chi tiết đơn
            </button>
          ) : (
            <button
              onClick={() => router.replace('/profile?tab=orders')}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition"
            >
              <Receipt size={18} />
              Đơn hàng của tôi
            </button>
          )}
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

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-green-600" /></div>}>
      <SuccessInner />
    </Suspense>
  );
}

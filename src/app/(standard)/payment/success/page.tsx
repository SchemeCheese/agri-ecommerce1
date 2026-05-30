'use client';

// Landed here after BE /payments/momo/return 302'd us with ?orderId=...&transId=...
// BE flips Order.CONFIRMED + Payment.PAID via markPaymentSucceeded (idempotent),
// but the IPN can lag 1–10s behind the browser redirect. So instead of confirming
// once, we POLL GET /payments/status/:orderId every 3s until PAID/FAILED or timeout.

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Receipt, Home, Loader2, Clock } from 'lucide-react';
import api from '@/lib/axios';

const POLL_INTERVAL_MS = 3000;     // hỏi BE mỗi 3 giây
const POLL_TIMEOUT_MS = 120_000;   // bỏ cuộc sau 2 phút → coi như chờ xử lý

type PayState = 'pending' | 'paid' | 'failed';

function SuccessInner() {
  const router = useRouter();
  const params = useSearchParams();
  // BE trả về `orderId` trong URL thật ra là CheckoutSession id (flow nhóm nhiều
  // shop). Để link sang trang chi tiết, FE phải lấy order_ids từ /payments/status.
  const sessionOrOrderId = params.get('orderId') ?? '';
  const amountParam = params.get('amount') ?? '';
  const transId = params.get('transId') ?? '';

  const [state, setState] = useState<PayState>('pending');
  const [orderIds, setOrderIds] = useState<string[]>([]);

  useEffect(() => {
    if (!sessionOrOrderId) {
      setState('failed');
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();
    let intervalId: ReturnType<typeof setInterval>;

    const poll = async () => {
      try {
        const r = await api.get(`/payments/status/${sessionOrOrderId}`);
        if (cancelled) return;
        const status = r.data?.status;
        const ids: string[] = Array.isArray(r.data?.order_ids) ? r.data.order_ids : [];
        if (ids.length) setOrderIds(ids);
        if (status === 'PAID') {
          setState('paid');
          clearInterval(intervalId);
          return;
        }
        if (status === 'FAILED') {
          setState('failed');
          clearInterval(intervalId);
          return;
        }
        // UNPAID / null → IPN chưa về, tiếp tục poll (trừ khi đã hết giờ)
      } catch {
        // Network blip — nuốt lỗi, để vòng lặp thử lại tới khi timeout.
      }
      if (!cancelled && Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        setState((s) => (s === 'pending' ? 'failed' : s));
        clearInterval(intervalId);
      }
    };

    intervalId = setInterval(poll, POLL_INTERVAL_MS);
    poll(); // chạy ngay lần đầu, không đợi 3s

    // Clear interval khi unmount / orderId đổi → chống memory leak.
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [sessionOrOrderId]);

  const amount = amountParam ? Number(amountParam) : null;

  // ─── Style theo trạng thái ────────────────────────────────────────────────
  const ui = {
    paid: {
      ring: 'bg-green-100',
      icon: <CheckCircle2 className="w-12 h-12 text-green-600" />,
      title: 'Thanh toán thành công',
      subtitle: 'Đơn hàng đã được xác nhận. Người bán sẽ chuẩn bị và giao hàng cho bạn.',
      btn: 'bg-green-600 hover:bg-green-700',
    },
    pending: {
      ring: 'bg-blue-100',
      icon: <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />,
      title: 'Đang xác nhận thanh toán...',
      subtitle: 'MoMo đã ghi nhận giao dịch. Hệ thống đang chờ xác nhận từ MoMo, vui lòng đợi trong giây lát.',
      btn: 'bg-blue-600 hover:bg-blue-700',
    },
    failed: {
      ring: 'bg-amber-100',
      icon: <Clock className="w-12 h-12 text-amber-600" />,
      title: 'Đang chờ xác nhận thanh toán',
      subtitle: 'Chúng tôi chưa nhận được xác nhận từ MoMo. Giao dịch có thể vẫn đang được xử lý — bạn có thể kiểm tra lại trong chi tiết đơn hàng sau ít phút.',
      btn: 'bg-amber-600 hover:bg-amber-700',
    },
  }[state];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        <div className={`w-20 h-20 mx-auto rounded-full ${ui.ring} flex items-center justify-center mb-4`}>
          {ui.icon}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{ui.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{ui.subtitle}</p>

        <div className="mt-6 space-y-2 bg-gray-50 rounded-xl p-4 text-sm text-left">
          <Row
            label={orderIds.length > 1 ? `Mã đơn hàng (${orderIds.length})` : 'Mã đơn hàng'}
            value={orderIds.length ? orderIds.join(', ') : sessionOrOrderId || '—'}
          />
          {amount != null && <Row label="Số tiền" value={`${amount.toLocaleString('vi-VN')} đ`} />}
          {transId && <Row label="Mã giao dịch MoMo" value={transId} />}
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(() => {
            // 1 đơn → link thẳng vào chi tiết. Nhiều đơn (giỏ multi-shop) → list
            // đơn hàng. Chưa có order_ids (poll chưa xong) → fallback list.
            if (orderIds.length === 1) {
              return (
                <button
                  // router.replace so back-button doesn't return user to MoMo / checkout
                  onClick={() => router.replace(`/profile/orders/${orderIds[0]}`)}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-semibold transition ${ui.btn}`}
                >
                  <Receipt size={18} />
                  Xem chi tiết đơn
                </button>
              );
            }
            return (
              <button
                onClick={() => router.replace('/profile?tab=orders')}
                className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-semibold transition ${ui.btn}`}
              >
                <Receipt size={18} />
                {orderIds.length > 1 ? `Xem ${orderIds.length} đơn vừa đặt` : 'Đơn hàng của tôi'}
              </button>
            );
          })()}
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

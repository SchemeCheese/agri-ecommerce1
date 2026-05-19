'use client';

// Buyer-side order details, with awaiting-payment actions for MoMo+UNPAID orders.
// "Thanh toán" → calls BE /payments/momo/create again, re-opens the MoMo redirect.
// "Đổi phương thức thanh toán" → modal that PATCHes /orders/:id/change-payment-method.
//
// Uses the existing getUserOrders endpoint (cheap) and finds the order by id —
// avoids adding a new BE endpoint just for one page.

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Wallet, Banknote, AlertCircle,
  Package, MapPin, Receipt, CheckCircle2,
} from 'lucide-react';
import api from '@/lib/axios';
import { resolveImageUrl } from '@/lib/runtime-config';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

type OrderItem = {
  id: string;
  quantity: number | string;
  negotiated_price: number | string;
  product: { id: string; name: string; images?: string[] };
};
type Payment = { id: string; payment_method: string; status: string; amount: number | string };
type Order = {
  id: string;
  status: string;
  payment_method: string;
  final_total_price: number | string;
  shipping_address: string;
  created_at: string;
  note?: string;
  order_items: OrderItem[];
  payments: Payment[];
  seller?: { full_name?: string; profile?: { store_name?: string } };
};

const formatVnd = (n: number | string) => `${Number(n).toLocaleString('vi-VN')} đ`;

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = params?.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [paying, setPaying] = useState(false);
  const [changing, setChanging] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);

  const refresh = async () => {
    try {
      const res = await api.get<Order[]>('/orders/my-orders');
      const match = res.data?.find((o) => o.id === orderId) ?? null;
      if (!match) setError('Không tìm thấy đơn hàng.');
      setOrder(match);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Lỗi khi tải đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (orderId) refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orderId]);

  // Awaiting-payment = MoMo + Order PENDING + Payment UNPAID.
  const payment = order?.payments?.[0];
  const isAwaitingMomo = useMemo(() =>
    !!order &&
    order.status === 'PENDING' &&
    order.payment_method === 'MOMO' &&
    payment?.status === 'UNPAID'
  , [order, payment]);

  const handleRetryPay = async () => {
    if (!order) return;
    setPaying(true);
    try {
      const res = await api.post('/payments/momo/create', { order_id: order.id });
      // Re-open MoMo. payUrl is the universal HTTPS link; replace current
      // location so back-button doesn't bring user back to half-state details page.
      if (res.data?.payUrl) {
        window.location.replace(res.data.payUrl);
      } else {
        setError('Không nhận được URL thanh toán từ MoMo.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Không tạo lại được giao dịch MoMo.');
    } finally {
      setPaying(false);
    }
  };

  const handleChangeToCod = async () => {
    if (!order) return;
    setChanging(true);
    try {
      await api.patch(`/orders/${order.id}/change-payment-method`, { payment_method: 'COD' });
      setChangeOpen(false);
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Không đổi được phương thức thanh toán.');
    } finally {
      setChanging(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-green-600" />
      </div>
    );
  }
  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-700">{error || 'Đơn hàng không tồn tại.'}</p>
        <Link href="/profile?tab=orders" className="text-green-700 font-semibold hover:underline">
          ← Quay lại danh sách đơn
        </Link>
      </div>
    );
  }

  const sellerName = order.seller?.profile?.store_name || order.seller?.full_name || 'Người bán';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <button
        onClick={() => router.replace('/profile?tab=orders')}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={16} />
        Danh sách đơn hàng
      </button>

      <header className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Đơn hàng #{order.id.slice(0, 8)}</h1>
            <p className="text-sm text-gray-500 mt-1">Đặt ngày {new Date(order.created_at).toLocaleString('vi-VN')}</p>
          </div>
          <StatusBadge status={order.status} paymentStatus={payment?.status} />
        </div>

        {isAwaitingMomo && (
          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-amber-900">Đơn hàng đang chờ thanh toán</p>
                <p className="text-amber-700 mt-1">
                  Bạn chọn thanh toán bằng MoMo nhưng giao dịch chưa hoàn tất. Bấm "Thanh toán" để
                  thử lại, hoặc đổi sang thanh toán khi nhận hàng (COD). Đơn sẽ tự huỷ sau 24h nếu
                  không thanh toán.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <button
                onClick={handleRetryPay}
                disabled={paying}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-pink-600 text-white font-semibold hover:bg-pink-700 transition disabled:opacity-60"
              >
                {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet size={18} />}
                Thanh toán
              </button>
              <button
                onClick={() => setChangeOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
              >
                <Banknote size={18} />
                Đổi phương thức thanh toán
              </button>
            </div>
          </div>
        )}
      </header>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
          <Package size={20} className="text-green-600" />
          Sản phẩm ({order.order_items.length})
        </h2>
        <p className="text-sm text-gray-500">Người bán: <b>{sellerName}</b></p>
        <div className="divide-y divide-gray-100">
          {order.order_items.map((it) => {
            const img = it.product.images?.[0];
            return (
              <div key={it.id} className="flex items-center gap-3 py-3">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                  {img ? (
                    <Image src={resolveImageUrl(img)} alt={it.product.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No img</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{it.product.name}</p>
                  <p className="text-xs text-gray-500">x {it.quantity} · {formatVnd(it.negotiated_price)}</p>
                </div>
                <p className="font-semibold text-gray-900">{formatVnd(Number(it.quantity) * Number(it.negotiated_price))}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
          <MapPin size={20} className="text-red-500" />
          Địa chỉ giao hàng
        </h2>
        <p className="text-sm text-gray-700">{order.shipping_address}</p>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
          <Receipt size={20} className="text-blue-500" />
          Thanh toán
        </h2>
        <div className="text-sm space-y-2">
          <div className="flex justify-between"><span className="text-gray-500">Phương thức</span><span className="font-medium">{order.payment_method}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Trạng thái thanh toán</span><span className="font-medium">{payment?.status ?? '—'}</span></div>
          <div className="flex justify-between text-base pt-2 border-t"><span className="font-semibold">Tổng cộng</span><span className="font-bold text-green-700">{formatVnd(order.final_total_price)}</span></div>
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg">{error}</p>
      )}

      {/* ── Change-method modal ───────────────────────────────────────── */}
      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi sang thanh toán khi nhận hàng (COD)?</DialogTitle>
            <DialogDescription>
              Đơn hàng sẽ chuyển sang phương thức <b>COD</b>. Người bán sẽ xác nhận đơn và bạn
              thanh toán bằng tiền mặt khi nhận hàng. Hành động này không thể hoàn tác — nếu sau
              đó bạn muốn dùng MoMo, phải huỷ và đặt lại đơn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              onClick={() => setChangeOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
              disabled={changing}
            >
              Để sau
            </button>
            <button
              onClick={handleChangeToCod}
              disabled={changing}
              className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 inline-flex items-center gap-2 disabled:opacity-60"
            >
              {changing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 size={16} />}
              Xác nhận đổi sang COD
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const StatusBadge = ({ status, paymentStatus }: { status: string; paymentStatus?: string }) => {
  // Awaiting-payment is the most actionable state — surface it as its own badge.
  if (status === 'PENDING' && paymentStatus === 'UNPAID') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-semibold">
        Chờ thanh toán
      </span>
    );
  }
  const colorMap: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-700',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    SHIPPING: 'bg-indigo-100 text-indigo-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-200 text-gray-600',
    ISSUE_REPORTED: 'bg-orange-100 text-orange-800',
    FAILED: 'bg-red-100 text-red-700',
    RETURNED: 'bg-rose-100 text-rose-700',
    REFUND_PENDING: 'bg-yellow-100 text-yellow-800',
    REFUNDED: 'bg-emerald-100 text-emerald-800',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${colorMap[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
};

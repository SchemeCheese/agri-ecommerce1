'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShoppingBag, Wallet, Star, Store, PackageCheck, Receipt } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminApi, formatVnd, type UserDetails } from '@/services/adminApi';

const fmtDate = (s: string) => new Date(s).toLocaleDateString('vi-VN');

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className={`inline-flex rounded-lg p-2 ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function StatusPills({ map }: { map: Record<string, number> }) {
  const entries = Object.entries(map).filter(([, v]) => v > 0);
  if (entries.length === 0) return <p className="text-sm text-slate-400">Chưa có dữ liệu.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([k, v]) => (
        <span key={k} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {k}: {v}
        </span>
      ))}
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{children}</span>;
}

export function UserDetailSheet({ userId, open, onClose }: { userId: string | null; open: boolean; onClose: () => void }) {
  const [data, setData] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'buyer' | 'seller'>('buyer');

  useEffect(() => {
    if (!open || !userId) return;
    setData(null);
    setError('');
    setLoading(true);
    adminApi
      .userDetails(userId)
      .then((d) => {
        setData(d);
        setTab(d.user.is_buyer ? 'buyer' : 'seller');
      })
      .catch((e: any) => setError(e?.response?.data?.message ?? 'Không tải được chi tiết người dùng.'))
      .finally(() => setLoading(false));
  }, [open, userId]);

  const u = data?.user;

  return (
    <Sheet open={open} onClose={onClose} title={u ? u.full_name : 'Chi tiết người dùng'} description={u?.email}>
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#16A34A]" />
        </div>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : data && u ? (
        <>
          {/* Header meta */}
          <div className="flex flex-wrap gap-2">
            {u.phone_number ? <Chip tone="bg-slate-100 text-slate-600">{u.phone_number}</Chip> : null}
            <Chip tone={u.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
              {u.is_active ? 'Đang hoạt động' : 'Đã khóa'}
            </Chip>
            <Chip tone={u.verified_email ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}>
              {u.verified_email ? 'Email đã xác thực' : 'Chưa xác thực email'}
            </Chip>
            {u.is_admin ? <Chip tone="bg-purple-50 text-purple-700">ADMIN</Chip> : null}
            {u.is_seller ? <Chip tone="bg-green-50 text-green-700">SELLER</Chip> : null}
            {u.is_buyer ? <Chip tone="bg-slate-100 text-slate-600">BUYER</Chip> : null}
            <Chip tone="bg-slate-100 text-slate-500">Tham gia {fmtDate(u.created_at)}</Chip>
          </div>

          {!u.is_buyer && !u.is_seller ? (
            <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              Tài khoản quản trị — không có hoạt động mua/bán.
            </p>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'buyer' | 'seller')} className="mt-5">
              <TabsList>
                <TabsTrigger value="buyer" disabled={!u.is_buyer}>
                  Hoạt động mua
                </TabsTrigger>
                <TabsTrigger value="seller" disabled={!u.is_seller}>
                  Hiệu suất bán
                </TabsTrigger>
              </TabsList>

              {/* BUYER */}
              <TabsContent value="buyer">
                <div className="grid grid-cols-3 gap-3">
                  <Stat icon={ShoppingBag} label="Tổng đơn" value={`${data.buyerSummary.totalOrders}`} tone="bg-blue-50 text-blue-600" />
                  <Stat icon={Wallet} label="Đã chi (hoàn thành)" value={formatVnd(data.buyerSummary.totalSpent)} tone="bg-green-50 text-green-600" />
                  <Stat icon={Star} label="Đánh giá đã viết" value={`${data.buyerSummary.reviewsWrittenCount}`} tone="bg-amber-50 text-amber-600" />
                </div>

                <p className="mt-4 mb-2 text-sm font-bold text-slate-700">Đơn theo trạng thái</p>
                <StatusPills map={data.buyerSummary.ordersByStatus} />

                <p className="mt-4 mb-2 text-sm font-bold text-slate-700">Đơn mua gần đây</p>
                {data.buyerSummary.recentOrders.length ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Mã đơn</th>
                          <th className="px-3 py-2">Người bán</th>
                          <th className="px-3 py-2">Trạng thái</th>
                          <th className="px-3 py-2 text-right">Tổng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.buyerSummary.recentOrders.map((o) => (
                          <tr key={o.id}>
                            <td className="px-3 py-2 font-mono text-xs">#{o.id.slice(-8)}</td>
                            <td className="px-3 py-2 text-slate-600">{o.seller?.full_name ?? '—'}</td>
                            <td className="px-3 py-2 text-xs">{o.status}</td>
                            <td className="px-3 py-2 text-right">{formatVnd(o.final_total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Chưa có đơn mua.</p>
                )}
              </TabsContent>

              {/* SELLER */}
              <TabsContent value="seller">
                <div className="grid grid-cols-3 gap-3">
                  <Stat icon={Wallet} label="Doanh thu" value={formatVnd(data.sellerSummary.totalRevenue)} tone="bg-green-50 text-green-600" />
                  <Stat icon={PackageCheck} label="Sản phẩm" value={`${data.sellerSummary.totalProducts}`} tone="bg-amber-50 text-amber-600" />
                  <Stat icon={Receipt} label="Đơn bán" value={`${data.sellerSummary.totalSoldOrders}`} tone="bg-blue-50 text-blue-600" />
                </div>

                <p className="mt-4 mb-2 text-sm font-bold text-slate-700">Sản phẩm theo trạng thái</p>
                <StatusPills map={data.sellerSummary.productsByStatus} />
                <p className="mt-3 mb-2 text-sm font-bold text-slate-700">Đơn bán theo trạng thái</p>
                <StatusPills map={data.sellerSummary.ordersByStatus} />

                <p className="mt-4 mb-2 text-sm font-bold text-slate-700">Sản phẩm gần đây</p>
                {data.sellerSummary.recentProducts.length ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Sản phẩm</th>
                          <th className="px-3 py-2">Trạng thái</th>
                          <th className="px-3 py-2 text-right">Giá</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.sellerSummary.recentProducts.map((p) => (
                          <tr key={p.id}>
                            <td className="px-3 py-2 text-slate-700">{p.name}</td>
                            <td className="px-3 py-2 text-xs">{p.status}</td>
                            <td className="px-3 py-2 text-right">{formatVnd(p.reference_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Chưa có sản phẩm.</p>
                )}

                <p className="mt-4 mb-2 text-sm font-bold text-slate-700">Đơn bán gần đây</p>
                {data.sellerSummary.recentSales.length ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Mã đơn</th>
                          <th className="px-3 py-2">Người mua</th>
                          <th className="px-3 py-2">Trạng thái</th>
                          <th className="px-3 py-2 text-right">Tổng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.sellerSummary.recentSales.map((o) => (
                          <tr key={o.id}>
                            <td className="px-3 py-2 font-mono text-xs">#{o.id.slice(-8)}</td>
                            <td className="px-3 py-2 text-slate-600">{o.buyer?.full_name ?? '—'}</td>
                            <td className="px-3 py-2 text-xs">{o.status}</td>
                            <td className="px-3 py-2 text-right">{formatVnd(o.final_total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Chưa có đơn bán.</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </>
      ) : null}
    </Sheet>
  );
}

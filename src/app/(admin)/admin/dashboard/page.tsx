'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users, Store, PackageCheck, Wallet, ShieldAlert, Loader2 } from 'lucide-react';
import { adminApi, formatVnd, type DashboardData } from '@/services/adminApi';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  ISSUE_REPORTED: 'Báo sự cố',
  FAILED: 'Thất bại',
  RETURNED: 'Trả hàng',
  REFUND_PENDING: 'Chờ hoàn',
  REFUNDED: 'Đã hoàn',
};

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className={`inline-flex rounded-xl p-2.5 ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .dashboard()
      .then(setData)
      .catch((e) => setError(e?.response?.data?.message ?? 'Không tải được dữ liệu.'));
  }, []);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!data)
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#16A34A]" />
      </div>
    );

  const chart = data.orders.byStatus.map((s) => ({ name: STATUS_LABEL[s.status] ?? s.status, count: s.count }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Doanh thu (đơn hoàn thành)" value={formatVnd(data.revenue)} tone="bg-green-50 text-green-600" />
        <StatCard icon={Users} label="Người dùng" value={`${data.users.total}`} tone="bg-blue-50 text-blue-600" />
        <StatCard icon={PackageCheck} label="Sản phẩm đang bán" value={`${data.products.active}/${data.products.total}`} tone="bg-amber-50 text-amber-600" />
        <StatCard icon={ShieldAlert} label="Khiếu nại đang mở" value={`${data.openDisputes}`} tone="bg-red-50 text-red-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Người mua" value={`${data.users.buyers}`} tone="bg-slate-100 text-slate-600" />
        <StatCard icon={Store} label="Người bán" value={`${data.users.sellers}`} tone="bg-slate-100 text-slate-600" />
        <StatCard icon={Store} label="Shop chờ duyệt" value={`${data.pendingShops}`} tone="bg-orange-50 text-orange-600" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-base font-bold text-slate-800">Đơn hàng theo trạng thái</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#16A34A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

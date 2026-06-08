// src/app/(seller)/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { DollarSign, Package, ShoppingCart, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { StatCard }       from '@/components/seller/dashboard/StatCard';
import { RevenueChart }   from '@/components/seller/dashboard/RevenueChart';
import { TopProductsList } from '@/components/seller/dashboard/TopProductsList';

const MONTH_LABELS: Record<string, string> = {
  '01': 'T1', '02': 'T2', '03': 'T3', '04': 'T4',
  '05': 'T5', '06': 'T6', '07': 'T7', '08': 'T8',
  '09': 'T9', '10': 'T10', '11': 'T11', '12': 'T12',
};

interface DashboardStats {
  /** Gross — tổng doanh thu đơn COMPLETED, chưa trừ hoàn tiền. */
  totalRevenue: number;
  /** Tổng tiền đã hoàn cho buyer. */
  refundedAmount: number;
  /** Thực nhận = gross − refunded. */
  netRevenue: number;
  totalOrders: number;
  activeProducts: number;
  revenueByMonth: { name: string; revenue: number }[];
  topProducts: { id: string; name: string; image?: string; stock: number; sold?: number; avgRating?: number }[];
  lowProducts:  { id: string; name: string; image?: string; stock: number; sold?: number; avgRating?: number }[];
}

export default function SellerDashboard() {
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Gọi song song: dashboard summary + products (để lấy image/stock)
        const [dashRes, prodRes] = await Promise.all([
          api.get('/orders/seller-dashboard'),
          api.get('/products/my-products'),
        ]);

        const d        = dashRes.data;
        const products: any[] = prodRes.data || [];

        // Map image/stock từ products list vào top3 arrays
        const productMap = new Map(products.map((p: any) => [p.id, p]));

        const enrich = (items: any[]) =>
          items.map((p: any) => {
            const full = productMap.get(p.id);
            return {
              id:        p.id,
              name:      p.name,
              image:     full?.images?.[0] ?? undefined,
              stock:     full?.stock       ?? 0,
              sold:      p.sold,
              avgRating: p.avgRating,
            };
          });

        // Дoanh thu theo tháng — BE trả [{month:'2026-02', revenue}]
        const revenueByMonth = (d.revenueByMonth || []).map((r: any) => ({
          name:    MONTH_LABELS[r.month?.split('-')[1]] ?? r.month,
          revenue: Number(r.revenue || 0),
        }));

        // BE mới trả grossRevenue/refundedAmount/netRevenue; BE cũ chỉ có
        // totalRevenue → fallback net = gross, refunded = 0 (không vỡ UI).
        const gross = Number(d.grossRevenue ?? d.totalRevenue ?? 0);
        setStats({
          totalRevenue:   gross,
          refundedAmount: Number(d.refundedAmount || 0),
          netRevenue:     Number(d.netRevenue ?? gross),
          totalOrders:    Number(d.totalOrders     || 0),
          activeProducts: Number(d.activeProducts  || 0),
          revenueByMonth,
          topProducts: enrich(d.top3BestSelling    || []),
          lowProducts:  enrich(d.top3NeedImprovement || []),
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tổng quan kinh doanh</h2>
        <p className="text-gray-500">Đây là tình hình kinh doanh của gian hàng.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Tổng doanh thu (Gross)"
          value={loading ? '...' : `${(stats?.totalRevenue ?? 0).toLocaleString()}đ`}
          subtitle="Đơn hoàn thành, chưa trừ hoàn tiền"
          icon={<DollarSign className="text-white" size={20} />}
          color="bg-green-500"
          loading={loading}
        />
        <StatCard
          title="Thực nhận (Net)"
          value={loading ? '...' : `${(stats?.netRevenue ?? 0).toLocaleString()}đ`}
          subtitle={
            (stats?.refundedAmount ?? 0) > 0
              ? `Đã hoàn tiền: ${(stats?.refundedAmount ?? 0).toLocaleString()}đ`
              : 'Chưa phát sinh hoàn tiền'
          }
          icon={<Wallet className="text-white" size={20} />}
          color="bg-emerald-600"
          loading={loading}
        />
        <StatCard
          title="Tổng Đơn Hàng"
          value={loading ? '...' : stats?.totalOrders ?? 0}
          icon={<ShoppingCart className="text-white" size={20} />}
          color="bg-blue-500"
          loading={loading}
        />
        <StatCard
          title="Sản Phẩm Đang Bán"
          value={loading ? '...' : stats?.activeProducts ?? 0}
          icon={<Package className="text-white" size={20} />}
          color="bg-orange-500"
          loading={loading}
        />
      </div>

      {/* Revenue Chart */}
      <RevenueChart data={stats?.revenueByMonth ?? []} />

      {/* Top / Low Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TopProductsList
          title="Sản phẩm bán chạy nhất"
          icon={<TrendingUp className="text-green-500" size={18} />}
          items={stats?.topProducts ?? []}
          loading={loading}
        />
        <TopProductsList
          title="Cần cải thiện (bán chậm)"
          icon={<TrendingDown className="text-red-500" size={18} />}
          items={stats?.lowProducts ?? []}
          isLow
          loading={loading}
        />
      </div>
    </div>
  );
}

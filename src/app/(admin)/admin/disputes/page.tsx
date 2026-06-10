'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ChevronRight } from 'lucide-react';
import { adminApi, formatVnd, type DisputeListItem, type Paginated } from '@/services/adminApi';
import { Pagination } from '@/components/ui/pagination';

const STATUS_TABS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING_SELLER_RESPONSE', label: 'Chờ seller' },
  { value: 'UNDER_ADMIN_REVIEW', label: 'Chờ admin xử' },
  { value: 'RESOLVED', label: 'Đã xử lý' },
  { value: 'CLOSED', label: 'Đã đóng' },
];

const STATUS_STYLE: Record<string, string> = {
  PENDING_SELLER_RESPONSE: 'bg-amber-50 text-amber-700',
  UNDER_ADMIN_REVIEW: 'bg-blue-50 text-blue-700',
  RESOLVED: 'bg-green-50 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};

export default function AdminDisputesPage() {
  const [data, setData] = useState<Paginated<DisputeListItem> | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminApi.listDisputes({ status: status || undefined, page, limit: 15 }));
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">Trung tâm xử lý tranh chấp</h2>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setStatus(t.value);
              setPage(1);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              status === t.value ? 'bg-[#16A34A] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#16A34A]" />
          </div>
        ) : data && data.items.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {data.items.map((d) => (
              <li key={d.id}>
                <Link href={`/admin/disputes/${d.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">
                      Đơn #{d.order.id.slice(-8)} · {formatVnd(d.order.final_total_price)}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      Mua: {d.buyer.full_name} ↔ Bán: {d.seller.full_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[d.status]}`}>
                      {STATUS_TABS.find((t) => t.value === d.status)?.label ?? d.status}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-12 text-center text-slate-400">Không có khiếu nại nào.</div>
        )}
      </div>

      {data ? <Pagination page={data.page} total={data.total} limit={data.limit} onPageChange={setPage} /> : null}
    </div>
  );
}

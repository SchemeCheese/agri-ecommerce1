'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, EyeOff, Eye } from 'lucide-react';
import { adminApi, formatVnd, type AdminProduct, type Paginated } from '@/services/adminApi';
import { Pagination } from '@/components/ui/pagination';
import { ProductDetailSheet } from '@/components/admin/ProductDetailSheet';

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700',
  INACTIVE: 'bg-amber-50 text-amber-700',
  OUT_OF_STOCK: 'bg-slate-100 text-slate-600',
  DELETED: 'bg-red-50 text-red-700',
};

export default function AdminProductsPage() {
  const [data, setData] = useState<Paginated<AdminProduct> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const openDetails = (id: string) => {
    setSelectedProductId(id);
    setSheetOpen(true);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminApi.listProducts({ page, limit: 15, search: search.trim() || undefined }));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const moderate = async (p: AdminProduct) => {
    const next = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    let reason: string | undefined;
    if (next === 'INACTIVE') {
      reason = window.prompt('Lý do ẩn sản phẩm (tùy chọn):') ?? undefined;
    }
    setBusyId(p.id);
    try {
      await adminApi.moderateProduct(p.id, next, reason);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Thao tác thất bại.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800">Kiểm duyệt sản phẩm</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            void load();
          }}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2"
        >
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sản phẩm / danh mục / người bán"
            className="w-64 text-sm outline-none"
          />
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Người bán</th>
              <th className="px-4 py-3">Giá</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#16A34A]" />
                </td>
              </tr>
            ) : data && data.items.length > 0 ? (
              data.items.map((p) => (
                <tr key={p.id} onClick={() => openDetails(p.id)} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.category?.name}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.seller?.full_name}</td>
                  <td className="px-4 py-3 text-slate-700">{formatVnd(p.reference_price)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[p.status] ?? 'bg-slate-100'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={busyId === p.id || p.status === 'DELETED'}
                      onClick={(e) => {
                        e.stopPropagation();
                        moderate(p);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${
                        p.status === 'ACTIVE' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {busyId === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : p.status === 'ACTIVE' ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      {p.status === 'ACTIVE' ? 'Ẩn' : 'Hiện'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Không có sản phẩm nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data ? <Pagination page={data.page} total={data.total} limit={data.limit} onPageChange={setPage} /> : null}

      <ProductDetailSheet productId={selectedProductId} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}

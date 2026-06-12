'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, Ban, CheckCircle2 } from 'lucide-react';
import { adminApi, type AdminUser, type Paginated } from '@/services/adminApi';
import { Pagination } from '@/components/ui/pagination';
import { UserDetailSheet } from '@/components/admin/UserDetailSheet';

type RoleFilter = 'ALL' | 'BUYER' | 'SELLER' | 'ADMIN';

const ROLE_TABS: { key: RoleFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'BUYER', label: 'Người mua' },
  { key: 'SELLER', label: 'Người bán' },
  { key: 'ADMIN', label: 'Admin' },
];

export default function AdminUsersPage() {
  const [data, setData] = useState<Paginated<AdminUser> | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const openDetails = (id: string) => {
    setSelectedUserId(id);
    setSheetOpen(true);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminApi.listUsers({
        page,
        limit: 15,
        search: search.trim() || undefined,
        role: role === 'ALL' ? undefined : role,
      }));
    } finally {
      setLoading(false);
    }
  }, [page, search, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (u: AdminUser) => {
    if (u.is_admin) return;
    setBusyId(u.id);
    try {
      await adminApi.setUserStatus(u.id, !u.is_active);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Thao tác thất bại.');
    } finally {
      setBusyId(null);
    }
  };

  const roleBadges = (u: AdminUser) =>
    [u.is_admin && 'ADMIN', u.is_seller && 'SELLER', u.is_buyer && 'BUYER'].filter(Boolean).join(' · ');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800">Quản lý người dùng</h2>
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
            placeholder="Tên / email / SĐT / shop / sản phẩm"
            className="w-72 text-sm outline-none"
          />
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setRole(tab.key);
              setPage(1);
            }}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
              role === tab.key
                ? 'border-[#16A34A] bg-green-50 text-[#16A34A]'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Người dùng</th>
              <th className="px-4 py-3">Vai trò</th>
              <th className="px-4 py-3">OTP</th>
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
              data.items.map((u) => (
                <tr key={u.id} onClick={() => openDetails(u.id)} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{u.full_name}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                    {u.phone_number ? <p className="text-xs text-slate-400">{u.phone_number}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-600">{roleBadges(u)}</td>
                  <td className="px-4 py-3">
                    {u.verified_email ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        u.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {u.is_active ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={u.is_admin || busyId === u.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(u);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${
                        u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {busyId === u.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : u.is_active ? (
                        <Ban className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      {u.is_active ? 'Khóa' : 'Mở khóa'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Không có người dùng nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data ? <Pagination page={data.page} total={data.total} limit={data.limit} onPageChange={setPage} /> : null}

      <UserDetailSheet userId={selectedUserId} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}

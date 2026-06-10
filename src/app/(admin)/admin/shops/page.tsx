'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, BadgeCheck, MapPin, ExternalLink } from 'lucide-react';
import { adminApi, type PendingShop } from '@/services/adminApi';

export default function AdminShopsPage() {
  const [shops, setShops] = useState<PendingShop[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setShops(await adminApi.pendingShops());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (s: PendingShop) => {
    setBusyId(s.user.id);
    try {
      await adminApi.verifyShop(s.user.id, true);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Duyệt thất bại.');
    } finally {
      setBusyId(null);
    }
  };

  if (!shops)
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#16A34A]" />
      </div>
    );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">Duyệt shop ({shops.length} chờ)</h2>
      {shops.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          Không có shop nào chờ duyệt 🎉
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {shops.map((s) => (
            <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{s.store_name ?? '(Chưa đặt tên shop)'}</p>
                  <p className="text-sm text-slate-500">
                    {s.user.full_name} · {s.user.email}
                  </p>
                </div>
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-600">Chờ duyệt</span>
              </div>
              {s.description ? <p className="mt-3 text-sm text-slate-600">{s.description}</p> : null}
              {s.address ? (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="h-4 w-4" /> {s.address}
                </p>
              ) : null}
              {s.shop_google_maps_url ? (
                <a
                  href={s.shop_google_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Xem vị trí Google Maps
                </a>
              ) : null}
              <button
                disabled={busyId === s.user.id}
                onClick={() => approve(s)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#16A34A] px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {busyId === s.user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                Duyệt & xác thực shop
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

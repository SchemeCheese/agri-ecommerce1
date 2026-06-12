'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, BadgeCheck, MapPin, ExternalLink } from 'lucide-react';
import { adminApi, type UnverifiedShop } from '@/services/adminApi';

export default function AdminShopsPage() {
  const [shops, setShops] = useState<UnverifiedShop[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setShops(await adminApi.unverifiedShops());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const verify = async (s: UnverifiedShop) => {
    setBusyId(s.user.id);
    try {
      await adminApi.verifyShop(s.user.id, true);
      await load();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
      alert(typeof message === 'string' ? message : 'Xác minh thất bại.');
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
      <div>
        <h2 className="text-lg font-bold text-slate-800">Xác minh shop ({shops.length} chưa xác minh)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Xác minh chỉ cấp huy hiệu uy tín công khai, không ảnh hưởng quyền bán hàng của shop.
        </p>
      </div>
      {shops.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          Tất cả shop hiện tại đã được xác minh.
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
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Chưa xác minh</span>
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
                onClick={() => verify(s)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {busyId === s.user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                Xác minh shop
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Loader2, Store, Tag, Boxes, MapPin, BadgeCheck, ShoppingBag } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { adminApi, formatVnd, type ProductDetails } from '@/services/adminApi';

const fmtDate = (s: string) => new Date(s).toLocaleDateString('vi-VN');

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700',
  INACTIVE: 'bg-amber-50 text-amber-700',
  OUT_OF_STOCK: 'bg-slate-100 text-slate-600',
  DELETED: 'bg-red-50 text-red-700',
};

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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-800">{value}</span>
    </div>
  );
}

export function ProductDetailSheet({ productId, open, onClose }: { productId: string | null; open: boolean; onClose: () => void }) {
  const [data, setData] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !productId) return;
    setData(null);
    setError('');
    setLoading(true);
    adminApi
      .productDetails(productId)
      .then(setData)
      .catch((e: any) => setError(e?.response?.data?.message ?? 'Không tải được chi tiết sản phẩm.'))
      .finally(() => setLoading(false));
  }, [open, productId]);

  const p = data?.product;

  return (
    <Sheet open={open} onClose={onClose} title={p ? p.name : 'Chi tiết sản phẩm'} description={p?.category?.name}>
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#16A34A]" />
        </div>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : data && p ? (
        <div className="space-y-5">
          {/* Ảnh */}
          {data.images.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {data.images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <a key={i} href={src} target="_blank" rel="noreferrer">
                  <img src={src} alt={`${p.name}-${i}`} className="h-28 w-full rounded-lg object-cover" />
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-400">Chưa có hình ảnh</div>
          )}

          {/* Trạng thái + giá + kho */}
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={Tag} label="Đơn giá" value={formatVnd(p.reference_price)} tone="bg-green-50 text-green-600" />
            <Stat icon={Boxes} label={`Tồn kho (${p.unit})`} value={`${Number(p.stock_quantity)}`} tone="bg-amber-50 text-amber-600" />
            <Stat icon={ShoppingBag} label="Đã bán (hoàn tất)" value={`${data.stats.soldQuantity}`} tone="bg-blue-50 text-blue-600" />
          </div>

          {/* Shop */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Store className="h-4 w-4 text-[#16A34A]" /> Cửa hàng
            </div>
            <Row label="Tên shop" value={p.seller.profile?.store_name ?? p.seller.full_name} />
            <Row
              label="Chủ shop"
              value={
                <span className="inline-flex items-center gap-1">
                  {p.seller.full_name}
                  {p.seller.profile?.is_verified ? <BadgeCheck className="h-3.5 w-3.5 text-blue-500" /> : null}
                </span>
              }
            />
            <Row label="Email" value={p.seller.email} />
            {p.seller.profile?.address ? <Row label="Địa chỉ shop" value={p.seller.profile.address} /> : null}
          </div>

          {/* Thông tin sản phẩm */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-1 text-sm font-bold text-slate-800">Thông tin sản phẩm</div>
            <Row
              label="Trạng thái"
              value={
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[p.status] ?? 'bg-slate-100'}`}>
                  {p.status}
                </span>
              }
            />
            <Row label="Danh mục" value={p.category?.name} />
            <Row label="Đơn vị" value={p.unit} />
            {p.certification ? <Row label="Chứng nhận" value={p.certification} /> : null}
            {p.location ? (
              <Row
                label="Xuất xứ"
                value={
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {p.location}
                  </span>
                }
              />
            ) : null}
            <Row
              label="Thương lượng tối thiểu"
              value={p.min_negotiation_qty ? `${Number(p.min_negotiation_qty)} ${p.unit}` : 'Không cho thương lượng'}
            />
            <Row label="Số lần được đặt" value={`${data.stats.timesOrdered}`} />
            <Row label="Ngày tạo" value={fmtDate(p.created_at)} />
          </div>

          {/* Mô tả */}
          {p.description ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-1 text-sm font-bold text-slate-800">Mô tả</div>
              <p className="whitespace-pre-wrap text-sm text-slate-600">{p.description}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Gavel, User, Store, Paperclip } from 'lucide-react';
import {
  adminApi,
  formatVnd,
  type DisputeDetail,
  type DisputeOutcome,
  type ResolutionAction,
} from '@/services/adminApi';
import { resolveImageUrl } from '@/lib/runtime-config';

// Chỉ những chuỗi trông giống ảnh mới render <img>. Dữ liệu rác (vd "evidence-0",
// tên file không đường dẫn) sẽ rơi vào fallback "Tệp đính kèm" thay vì ảnh vỡ.
function isImageLike(src: string): boolean {
  return /^(https?:\/\/|data:image\/|blob:|\/uploads\/|\/)/i.test(src.trim());
}

// 1 ô bằng chứng: ảnh có onError fallback; chuỗi không phải ảnh → icon "Tệp đính kèm".
function EvidenceThumb({ src, index }: { src: string; index: number }) {
  const [failed, setFailed] = useState(false);
  const clean = (src ?? '').trim();

  if (!clean || !isImageLike(clean) || failed) {
    return (
      <div className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-1 text-slate-400">
        <Paperclip className="h-5 w-5" />
        <span className="line-clamp-2 break-all text-center text-[10px]">{clean || 'Tệp đính kèm'}</span>
      </div>
    );
  }

  const url = resolveImageUrl(clean);
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Bằng chứng ${index + 1}`}
        onError={() => setFailed(true)}
        className="h-24 w-full rounded-lg object-cover"
      />
    </a>
  );
}

const OUTCOMES: { value: DisputeOutcome; label: string }[] = [
  { value: 'PENDING', label: 'Chưa kết luận' },
  { value: 'SELLER_FAULT', label: 'Lỗi người bán' },
  { value: 'BUYER_FAULT', label: 'Lỗi người mua' },
  { value: 'SHIPPING_FAULT', label: 'Lỗi vận chuyển' },
  { value: 'INSUFFICIENT_EVIDENCE', label: 'Không đủ bằng chứng' },
];

const ACTIONS: { value: ResolutionAction; label: string }[] = [
  { value: 'NONE', label: 'Chưa hành động' },
  { value: 'REFUND_BUYER', label: 'Hoàn tiền người mua' },
  { value: 'RELEASE_PAYMENT_TO_SELLER', label: 'Giải ngân cho người bán (hoàn tất đơn)' },
  { value: 'PARTIAL_REFUND', label: 'Hoàn một phần' },
  { value: 'CLOSE_WITHOUT_ACTION', label: 'Đóng, giữ nguyên' },
];

function EvidencePanel({
  title,
  icon: Icon,
  reason,
  images,
  video,
  tone,
}: {
  title: string;
  icon: any;
  reason: string | null;
  images: string[];
  video: string | null;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className={`mb-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-bold ${tone}`}>
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <p className="whitespace-pre-wrap text-sm text-slate-700">{reason || <span className="text-slate-400">Chưa có nội dung.</span>}</p>
      {images.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {images.map((src, i) => (
            <EvidenceThumb key={i} src={src} index={i} />
          ))}
        </div>
      ) : null}
      {video ? (
        <video src={video} controls className="mt-3 w-full rounded-lg" />
      ) : null}
    </div>
  );
}

export default function AdminDisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<DisputeDetail | null>(null);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState<DisputeOutcome>('SELLER_FAULT');
  const [action, setAction] = useState<ResolutionAction>('REFUND_BUYER');
  const [refundAmount, setRefundAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setD(await adminApi.getDispute(id));
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Không tải được khiếu nại.');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const adjudicate = async () => {
    setSubmitting(true);
    try {
      await adminApi.adjudicate(id, {
        outcome,
        action_taken: action,
        admin_notes: notes.trim() || undefined,
        refund_amount: action === 'PARTIAL_REFUND' ? Number(refundAmount) : undefined,
      });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Phán quyết thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <p className="text-red-500">{error}</p>;
  if (!d)
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#16A34A]" />
      </div>
    );

  const resolved = d.status === 'RESOLVED' || d.status === 'CLOSED';

  return (
    <div className="space-y-5">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-lg font-bold text-slate-900">
              Khiếu nại đơn #{d.order.id.slice(-8)} · {formatVnd(d.order.final_total_price)}
            </p>
            <p className="text-sm text-slate-500">
              {d.buyer.full_name} (mua) ↔ {d.seller.full_name} (bán) · Thanh toán: {d.order.payment_method} · Đơn:{' '}
              {d.order.status}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{d.status}</span>
        </div>
        {d.order.order_items?.length ? (
          <ul className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
            {d.order.order_items.map((it) => (
              <li key={it.id} className="flex justify-between">
                <span>{it.product.name}</span>
                <span>
                  {it.quantity} × {formatVnd(it.negotiated_price)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Bằng chứng 2 phía */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EvidencePanel
          title="Người mua (tố cáo)"
          icon={User}
          reason={d.buyer_reason}
          images={d.buyer_images}
          video={d.buyer_video}
          tone="bg-red-50 text-red-600"
        />
        <EvidencePanel
          title="Người bán (giải trình)"
          icon={Store}
          reason={d.seller_explanation}
          images={d.seller_images}
          video={d.seller_video}
          tone="bg-blue-50 text-blue-600"
        />
      </div>

      {/* Phán quyết */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 inline-flex items-center gap-2 text-base font-bold text-slate-800">
          <Gavel className="h-5 w-5 text-[#16A34A]" /> Phán quyết
        </div>

        {resolved ? (
          <div className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
            Đã xử lý: <b>{OUTCOMES.find((o) => o.value === d.outcome)?.label}</b> →{' '}
            <b>{ACTIONS.find((a) => a.value === d.action_taken)?.label}</b>
            {d.admin_notes ? <p className="mt-1 text-green-700">Ghi chú: {d.admin_notes}</p> : null}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-600">Kết luận lỗi</span>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as DisputeOutcome)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                >
                  {OUTCOMES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-600">Hành động xử lý</span>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as ResolutionAction)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                >
                  {ACTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-semibold text-slate-600">Ghi chú nội bộ của Admin</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Lý do phán quyết, căn cứ bằng chứng..."
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
            {action === 'PARTIAL_REFUND' ? (
              <label className="block">
                <span className="text-sm font-semibold text-slate-600">Số tiền hoàn một phần</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, Number(d.order.final_total_price) - 1)}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`Nhỏ hơn ${formatVnd(d.order.final_total_price)}`}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Tổng đơn: {formatVnd(d.order.final_total_price)}. Hoàn toàn bộ thì chọn “Hoàn tiền người mua”.
                </p>
              </label>
            ) : null}
            <button
              onClick={adjudicate}
              disabled={submitting || (action === 'PARTIAL_REFUND' && !refundAmount)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#16A34A] px-5 py-2.5 font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
              Ra phán quyết
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

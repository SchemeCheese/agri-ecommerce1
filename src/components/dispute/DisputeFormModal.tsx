'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { X, Loader2, ImagePlus, ShieldAlert, Trash2 } from 'lucide-react';
import { disputeApi, uploadEvidenceImage, type DisputeStatus } from '@/services/disputeApi';
import { resolveImageUrl } from '@/lib/runtime-config';

function getErrorMessage(error: unknown, fallback: string) {
  const message = axios.isAxiosError(error)
    ? error.response?.data?.message
    : error instanceof Error
      ? error.message
      : null;

  return Array.isArray(message) ? message.join(', ') : typeof message === 'string' ? message : fallback;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** buyer: mở khiếu nại mới cho đơn. seller: gửi bằng chứng giải trình. */
  mode: 'buyer' | 'seller';
  orderId: string;
  onSuccess?: () => void;
}

export function DisputeFormModal({ open, onClose, mode, orderId, onSuccess }: Props) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // seller mode: cần disputeId của đơn
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [disputeStatus, setDisputeStatus] = useState<DisputeStatus | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setText('');
    setImages([]);
    setError('');
    setDisputeId(null);
    setDisputeStatus(null);
    if (mode === 'seller') {
      setResolving(true);
      disputeApi
        .byOrder(orderId)
        .then((d) => {
          if (!d) setError('Không tìm thấy khiếu nại cho đơn này.');
          else {
            setDisputeId(d.id);
            setDisputeStatus(d.status);
          }
        })
        .catch(() => setError('Không tải được khiếu nại.'))
        .finally(() => setResolving(false));
    }
  }, [open, mode, orderId]);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      for (const f of Array.from(files).slice(0, 6 - images.length)) {
        const url = await uploadEvidenceImage(f);
        setImages((prev) => [...prev, url]);
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Upload ảnh thất bại.'));
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (text.trim().length < 5) {
      setError('Vui lòng nhập ít nhất 5 ký tự.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (mode === 'buyer') {
        await disputeApi.create(orderId, { reason: text.trim(), images });
      } else {
        if (!disputeId) throw new Error('Thiếu mã khiếu nại.');
        await disputeApi.respond(disputeId, { explanation: text.trim(), images });
      }
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Gửi thất bại.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const isBuyer = mode === 'buyer';
  const sellerCanRespond = mode !== 'seller' || disputeStatus === 'PENDING_SELLER_RESPONSE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-bold text-slate-900">
              {isBuyer ? 'Gửi khiếu nại (kèm bằng chứng)' : 'Gửi bằng chứng giải trình'}
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {resolving ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#16A34A]" />
            </div>
          ) : !sellerCanRespond && disputeStatus ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                <p className="font-bold">
                  {disputeStatus === 'UNDER_ADMIN_REVIEW'
                    ? 'Người bán đã gửi bằng chứng.'
                    : 'Khiếu nại này không còn chờ người bán phản hồi.'}
                </p>
                <p className="mt-1">
                  {disputeStatus === 'UNDER_ADMIN_REVIEW'
                    ? 'Bằng chứng đang chờ Admin xem xét và phân xử.'
                    : 'Bạn không thể gửi thêm bằng chứng cho khiếu nại này.'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full rounded-xl bg-slate-900 py-3 font-bold text-white hover:bg-slate-700"
              >
                Đóng
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500">
                {isBuyer
                  ? 'Mô tả vấn đề và tải ảnh/video bóc hàng. Admin sẽ phân xử dựa trên bằng chứng — hệ thống KHÔNG tự hoàn tiền.'
                  : 'Giải trình và tải ảnh đóng gói/niêm phong. Admin sẽ xem bằng chứng 2 phía rồi phán quyết.'}
              </p>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder={isBuyer ? 'Lý do khiếu nại…' : 'Nội dung giải trình…'}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />

              {/* Ảnh bằng chứng */}
              <div>
                <div className="flex flex-wrap gap-2">
                  {images.map((url, i) => (
                    <div key={i} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={resolveImageUrl(url)} alt={`ev-${i}`} className="h-20 w-20 rounded-lg object-cover" />
                      <button
                        onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {images.length < 6 ? (
                    <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-green-400">
                      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                      <span className="mt-1 text-[10px]">Thêm ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => onFiles(e.target.files)}
                        disabled={uploading}
                      />
                    </label>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-400">Tối đa 6 ảnh.</p>
              </div>

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              <button
                onClick={submit}
                disabled={submitting || uploading || (mode === 'seller' && (!disputeId || !sellerCanRespond))}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {isBuyer ? 'Gửi khiếu nại' : 'Gửi bằng chứng'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

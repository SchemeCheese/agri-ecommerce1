'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Flag } from 'lucide-react';
import api from '@/lib/axios';
import { io } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface BuyerOrderActionsCardProps {
  orderId: string;
  currentStatus: string;
}

// Dialog đang mở (null = không có). Mỗi action 1 dialog Shadcn (render qua Portal
// vào document.body → thoát khỏi containing-block bị transform của chat widget,
// nên không bị clip như modal `position: fixed` cũ).
type DialogKind = 'complete' | 'report-issue';

export const BuyerOrderActionsCard = ({ orderId, currentStatus }: BuyerOrderActionsCardProps) => {
  const [liveStatus, setLiveStatus] = useState(currentStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<DialogKind | null>(null);
  const [reportNote, setReportNote] = useState('');

  // Đồng bộ khi card cha đẩy currentStatus mới (hydrate lịch sử / socket ở card cha).
  useEffect(() => {
    setLiveStatus(currentStatus);
  }, [currentStatus]);

  // Socket: cập nhật liveStatus realtime khi BE emit orderStatusUpdated.
  useEffect(() => {
    if (!orderId) return;

    const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket'],
      reconnection: true,
    });

    socket.on('orderStatusUpdated', (payload: any) => {
      if (payload?.orderId === orderId) {
        setLiveStatus(payload.newStatus);
        setIsLoading(false);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  const closeDialog = () => {
    if (isLoading) return; // chặn đóng giữa lúc đang gọi API
    setOpenDialog(null);
    setReportNote('');
    setError(null);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await api.patch(`/orders/${orderId}/complete`);
      // Đóng dialog ngay; socket sẽ đẩy trạng thái mới, set thủ công phòng socket trễ.
      setLiveStatus('COMPLETED');
      setOpenDialog(null);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Không thể xác nhận đã nhận hàng.';
      setError(typeof message === 'string' ? message : 'Không thể xác nhận đã nhận hàng.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportIssue = async () => {
    if (!reportNote.trim()) {
      setError('Vui lòng nhập mô tả chi tiết sự cố.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // BE: PATCH /orders/:id/report-issue, body { note } (ReportIssueDto.note).
      await api.patch(`/orders/${orderId}/report-issue`, { note: reportNote.trim() });
      setLiveStatus('ISSUE_REPORTED');
      setOpenDialog(null);
      setReportNote('');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Không thể gửi báo cáo.';
      setError(typeof message === 'string' ? message : 'Không thể gửi báo cáo.');
    } finally {
      setIsLoading(false);
    }
  };

  const canComplete = liveStatus === 'SHIPPING';
  const canReportIssue = liveStatus === 'SHIPPING';
  const hasActions = canComplete || canReportIssue;

  if (!hasActions) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {canComplete && (
        <Button
          onClick={() => { setError(null); setOpenDialog('complete'); }}
          disabled={isLoading}
          variant="default"
          size="sm"
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin mr-1" /> : <CheckCircle2 size={16} className="mr-1" />}
          {isLoading ? 'Đang xử lý...' : 'Đã nhận được hàng'}
        </Button>
      )}

      {canReportIssue && (
        <Button
          onClick={() => { setError(null); setReportNote(''); setOpenDialog('report-issue'); }}
          disabled={isLoading}
          variant="destructive"
          size="sm"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin mr-1" /> : <Flag size={16} className="mr-1" />}
          {isLoading ? 'Đang xử lý...' : 'Báo cáo'}
        </Button>
      )}

      {/* ── Dialog: Xác nhận đã nhận hàng (Shadcn / Portal) ───────────────── */}
      <Dialog open={openDialog === 'complete'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận đã nhận và kiểm tra?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bạn xác nhận đã nhận được hàng và kiểm tra đầy đủ. Đơn hàng sẽ được đánh dấu hoàn tất.
          </p>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2 text-xs text-red-700">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={closeDialog}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-gray-300 py-2 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60 transition"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={isLoading}
              className="flex-1 rounded-lg bg-green-600 py-2 px-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2 transition"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Xác nhận
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Báo cáo chưa nhận được hàng (textarea, Shadcn / Portal) ── */}
      <Dialog open={openDialog === 'report-issue'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Chưa nhận được hàng / Báo cáo sự cố</DialogTitle>
          </DialogHeader>
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Mô tả chi tiết</label>
            <textarea
              value={reportNote}
              onChange={(e) => { setReportNote(e.target.value); setError(null); }}
              placeholder="Ví dụ: Chưa nhận được gói hàng, hàng bị hỏng, không đúng mô tả..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 resize-none"
            />
          </div>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2 text-xs text-red-700">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={closeDialog}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-gray-300 py-2 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60 transition"
            >
              Thoát
            </button>
            <button
              type="button"
              onClick={handleReportIssue}
              disabled={isLoading || !reportNote.trim()}
              className="flex-1 rounded-lg bg-red-600 py-2 px-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2 transition"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />}
              Gửi báo cáo
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

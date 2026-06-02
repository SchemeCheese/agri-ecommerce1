'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Package, Loader2, AlertCircle, Trash2 } from 'lucide-react';
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

interface SellerOrderActionsCardProps {
  orderId: string;
  currentStatus: string;
}

// Mỗi action mở 1 Shadcn Dialog (render qua Portal vào document.body) thay cho
// modal `position: fixed` cũ — vốn bị clip bởi containing-block transform của
// chat widget. confirm/ship là dialog xác nhận; cancel có textarea lý do.
type DialogKind = 'confirm' | 'ship' | 'confirm-lost' | 'cancel';

export const SellerOrderActionsCard = ({ orderId, currentStatus }: SellerOrderActionsCardProps) => {
  const [liveStatus, setLiveStatus] = useState(currentStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<DialogKind | null>(null);
  const [cancelReason, setCancelReason] = useState('');

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
    if (isLoading) return;
    setOpenDialog(null);
    setCancelReason('');
    setError(null);
  };

  // Gọi 1 endpoint PATCH đơn giản (confirm / ship / confirm-lost), set status sau
  // khi thành công (socket cũng sẽ xác nhận lại). nextStatus dùng để cập nhật UI
  // ngay vì confirm-lost không emit orderStatusUpdated từ BE.
  const runSimpleAction = async (path: string, nextStatus: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.patch(`/orders/${orderId}/${path}`);
      setLiveStatus(nextStatus);
      setOpenDialog(null);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Không thể thực hiện hành động.';
      setError(typeof message === 'string' ? message : 'Không thể thực hiện hành động.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setError('Vui lòng nhập lý do hủy đơn.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await api.patch(`/orders/${orderId}/cancel`, { reason: cancelReason.trim() });
      setLiveStatus('CANCELLED');
      setOpenDialog(null);
      setCancelReason('');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Không thể hủy đơn hàng.';
      setError(typeof message === 'string' ? message : 'Không thể hủy đơn hàng.');
    } finally {
      setIsLoading(false);
    }
  };

  const canConfirm = liveStatus === 'PENDING';
  const canShip = liveStatus === 'CONFIRMED';
  const canConfirmLost = liveStatus === 'ISSUE_REPORTED';
  const canCancel = liveStatus === 'PENDING' || liveStatus === 'CONFIRMED';
  const hasActions = canConfirm || canShip || canConfirmLost || canCancel;

  if (!hasActions) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {canConfirm && (
        <Button
          onClick={() => { setError(null); setOpenDialog('confirm'); }}
          disabled={isLoading}
          variant="default"
          size="sm"
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin mr-1" /> : <CheckCircle2 size={16} className="mr-1" />}
          {isLoading ? 'Đang xử lý...' : 'Xác nhận đơn'}
        </Button>
      )}

      {canShip && (
        <Button
          onClick={() => { setError(null); setOpenDialog('ship'); }}
          disabled={isLoading}
          variant="default"
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin mr-1" /> : <Package size={16} className="mr-1" />}
          {isLoading ? 'Đang xử lý...' : 'Giao hàng'}
        </Button>
      )}

      {canConfirmLost && (
        <Button
          onClick={() => { setError(null); setOpenDialog('confirm-lost'); }}
          disabled={isLoading}
          variant="destructive"
          size="sm"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin mr-1" /> : <AlertCircle size={16} className="mr-1" />}
          {isLoading ? 'Đang xử lý...' : 'Xác nhận thất lạc'}
        </Button>
      )}

      {canCancel && (
        <Button
          onClick={() => { setError(null); setCancelReason(''); setOpenDialog('cancel'); }}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="border-red-200 text-red-600 hover:bg-red-50"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin mr-1" /> : <Trash2 size={16} className="mr-1" />}
          {isLoading ? 'Đang xử lý...' : 'Hủy đơn'}
        </Button>
      )}

      {/* ── Dialog: Xác nhận đơn ──────────────────────────────────────────── */}
      <Dialog open={openDialog === 'confirm'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bạn muốn chuẩn bị đơn này?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Xác nhận đơn hàng để bắt đầu chuẩn bị và giao cho người mua.</p>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2 text-xs text-red-700">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              onClick={closeDialog}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              Huỷ
            </Button>
            <Button
              type="button"
              onClick={() => runSimpleAction('confirm', 'CONFIRMED')}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin mr-1" /> : <CheckCircle2 size={14} className="mr-1" />}
              Xác nhận đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Giao hàng ─────────────────────────────────────────────── */}
      <Dialog open={openDialog === 'ship'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận đã gửi hàng?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Đơn hàng sẽ chuyển sang trạng thái đang giao cho người mua.</p>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2 text-xs text-red-700">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              onClick={closeDialog}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              Huỷ
            </Button>
            <Button
              type="button"
              onClick={() => runSimpleAction('ship', 'SHIPPING')}
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Package size={14} className="mr-1" />}
              Giao hàng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Xác nhận hàng thất lạc ────────────────────────────────── */}
      <Dialog open={openDialog === 'confirm-lost'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận hàng đã thất lạc?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Xác nhận đơn hàng bị thất lạc. Nếu người mua đã thanh toán trước, hệ thống sẽ tiến hành hoàn tiền.
          </p>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2 text-xs text-red-700">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              onClick={closeDialog}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              Huỷ
            </Button>
            <Button
              type="button"
              onClick={() => runSimpleAction('confirm-lost', 'FAILED')}
              disabled={isLoading}
              variant="destructive"
              className="flex-1"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin mr-1" /> : <AlertCircle size={14} className="mr-1" />}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Hủy đơn (textarea lý do) ──────────────────────────────── */}
      <Dialog open={openDialog === 'cancel'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hủy đơn hàng</DialogTitle>
          </DialogHeader>
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Lý do hủy đơn</label>
            <textarea
              value={cancelReason}
              onChange={(e) => { setCancelReason(e.target.value); setError(null); }}
              placeholder="Ví dụ: Hết hàng, không thể giao..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 resize-none"
            />
          </div>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2 text-xs text-red-700">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              onClick={closeDialog}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              Thoát
            </Button>
            <Button
              type="button"
              onClick={handleCancel}
              disabled={isLoading || !cancelReason.trim()}
              variant="destructive"
              className="flex-1"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Trash2 size={14} className="mr-1" />}
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

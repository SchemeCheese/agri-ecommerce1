"use client";

import React, { useEffect, useRef } from "react";
import { LogIn, ShieldCheck, X } from "lucide-react";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onConfirmLogin: () => void;
};

export default function LoginRequiredDialog({
  open,
  title = "Cần đăng nhập",
  description = "Vui lòng đăng nhập để chat với Shop và xem lại lịch sử tin nhắn.",
  onClose,
  onConfirmLogin,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center border border-green-100">
                <ShieldCheck size={22} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg leading-tight">{title}</h3>
                <p className="text-sm text-gray-500 mt-1">{description}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-900"
              aria-label="Đóng"
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
            >
              Để sau
            </button>
            <button
              type="button"
              onClick={onConfirmLogin}
              className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-600/20"
            >
              <LogIn size={16} /> Đăng nhập
            </button>
          </div>

          <p className="mt-4 text-xs text-gray-400 leading-relaxed">
            Sau khi đăng nhập, bạn có thể chat và theo dõi trạng thái hỗ trợ nhanh hơn.
          </p>
        </div>
      </div>
    </div>
  );
}

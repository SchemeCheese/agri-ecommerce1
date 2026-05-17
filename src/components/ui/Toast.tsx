"use client";
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error';

// Item check cho toast list dạng "checklist" — dùng cho password rules, validate form...
export interface ToastCheckItem {
  label: string;
  ok: boolean;
}

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  checks?: ToastCheckItem[];
  onClose: () => void;
}

export function Toast({ message, type = 'success', duration = 3000, checks, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Toast có checks → hiển thị lâu hơn để user đọc kỹ
    const realDuration = checks?.length ? Math.max(duration, 5000) : duration;
    const show = setTimeout(() => setVisible(true), 10);
    const hide = setTimeout(() => { setVisible(false); setTimeout(onClose, 300); }, realDuration);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [duration, onClose, checks]);

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 w-[min(92vw,420px)]
      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}>
      <div className={`rounded-xl shadow-xl text-white
        ${type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>
        <div className="flex items-start gap-3 px-5 py-3.5">
          {type === 'success' ? <CheckCircle size={18} className="mt-0.5 shrink-0" /> : <XCircle size={18} className="mt-0.5 shrink-0" />}
          <span className="flex-1 text-sm font-medium">{message}</span>
          <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="opacity-70 hover:opacity-100 shrink-0">
            <X size={16} />
          </button>
        </div>
        {checks && checks.length > 0 && (
          <div className="px-5 pb-3 pt-1 border-t border-white/20">
            <ul className="space-y-1 text-xs">
              {checks.map((c, i) => (
                <li key={i} className={`flex items-center gap-2 ${c.ok ? 'text-white' : 'text-white/85'}`}>
                  <span className={`inline-flex w-4 h-4 rounded-full items-center justify-center text-[10px] font-bold
                    ${c.ok ? 'bg-white/30' : 'bg-white/15'}`}>
                    {c.ok ? '✓' : '✗'}
                  </span>
                  <span className={c.ok ? '' : 'line-through opacity-80'}>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType; checks?: ToastCheckItem[] } | null>(null);

  const show = (message: string, type: ToastType = 'success', checks?: ToastCheckItem[]) => setToast({ message, type, checks });
  const hide = () => setToast(null);

  const ToastNode = toast ? <Toast message={toast.message} type={toast.type} checks={toast.checks} onClose={hide} /> : null;

  return { show, ToastNode };
}

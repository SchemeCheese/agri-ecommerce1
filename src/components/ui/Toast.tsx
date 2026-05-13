"use client";
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'success', duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 10);
    const hide = setTimeout(() => { setVisible(false); setTimeout(onClose, 300); }, duration);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [duration, onClose]);

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300
      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}>
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white text-sm font-medium
        ${type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>
        {type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
        <span>{message}</span>
        <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="ml-1 opacity-70 hover:opacity-100">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const show = (message: string, type: ToastType = 'success') => setToast({ message, type });
  const hide = () => setToast(null);

  const ToastNode = toast ? <Toast message={toast.message} type={toast.type} onClose={hide} /> : null;

  return { show, ToastNode };
}

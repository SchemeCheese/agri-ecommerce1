'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Tailwind max-width của panel (mặc định max-w-2xl). */
  widthClass?: string;
}

// Slide-over panel từ cạnh phải (shadcn-style Sheet, không phụ thuộc Radix).
export function Sheet({ open, onClose, title, description, children, widthClass = 'max-w-2xl' }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <div className={cn('fixed inset-0 z-50', open ? '' : 'pointer-events-none')} aria-hidden={!open}>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={cn('absolute inset-0 bg-black/40 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out',
          widthClass,
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
          <div className="min-w-0">
            {title ? <div className="text-lg font-bold text-slate-900">{title}</div> : null}
            {description ? <div className="mt-0.5 text-sm text-slate-500">{description}</div> : null}
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}

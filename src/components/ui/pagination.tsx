'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  className?: string;
}

// Sinh dãy số trang có ellipsis thông minh: 1 … 4 [5] 6 … 10
function buildPageItems(current: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const items: (number | 'ellipsis')[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(totalPages - 1, current + 1);

  if (left > 2) items.push('ellipsis');
  for (let p = left; p <= right; p++) items.push(p);
  if (right < totalPages - 1) items.push('ellipsis');

  items.push(totalPages);
  return items;
}

export function Pagination({ page, total, limit, onPageChange, className }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(Math.max(1, page), totalPages);
  const items = buildPageItems(current, totalPages);

  const go = (p: number) => {
    if (p < 1 || p > totalPages || p === current) return;
    onPageChange(p);
  };

  const btn =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <p className="text-sm text-slate-500">
        Trang <span className="font-semibold text-slate-700">{current}</span> trên tổng số{' '}
        <span className="font-semibold text-slate-700">{totalPages}</span> trang (
        <span className="font-semibold text-slate-700">{total}</span> bản ghi)
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => go(current - 1)}
          disabled={current <= 1}
          aria-label="Trang trước"
          className={cn(btn, 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {items.map((it, idx) =>
          it === 'ellipsis' ? (
            <span key={`e-${idx}`} className="px-1 text-slate-400">
              …
            </span>
          ) : (
            <button
              key={it}
              type="button"
              onClick={() => go(it)}
              aria-current={it === current ? 'page' : undefined}
              className={cn(
                btn,
                it === current
                  ? 'border-[#16A34A] bg-[#16A34A] text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              {it}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => go(current + 1)}
          disabled={current >= totalPages}
          aria-label="Trang sau"
          className={cn(btn, 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

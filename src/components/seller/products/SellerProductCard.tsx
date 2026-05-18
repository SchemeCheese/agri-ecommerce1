"use client";

import React from 'react';
import Image from 'next/image';
import { SellerProduct, ProductStatus } from '@/hooks/useSellerProducts';
import { Edit, Trash2, Eye, Package, Star, PackagePlus, RotateCcw } from 'lucide-react';

interface SellerProductCardProps {
  product: SellerProduct;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRestock?: (id: string) => void;
  onRestore?: (id: string) => void;
}

// Tailwind class map per status. Reused for the absolute badge.
const STATUS_STYLE: Record<ProductStatus, { label: string; cls: string }> = {
  ACTIVE:       { label: 'Đang bán',  cls: 'bg-green-500/95 text-white' },
  OUT_OF_STOCK: { label: 'Hết hàng',  cls: 'bg-amber-500/95 text-white' },
  INACTIVE:     { label: 'Tạm ẩn',    cls: 'bg-gray-500/95 text-white'  },
  DELETED:      { label: 'Đã xóa',    cls: 'bg-red-500/95 text-white'   },
};

export const SellerProductCard = ({
  product,
  onEdit,
  onDelete,
  onRestock,
  onRestore,
}: SellerProductCardProps) => {
  const price = Number(product.price);
  // Fall back to legacy is_active for older API responses that don't yet include status
  const status: ProductStatus =
    product.status ?? (product.stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK');
  const badge = STATUS_STYLE[status];

  const dimmed = status === 'DELETED' || status === 'INACTIVE';
  const canRestock = status === 'OUT_OF_STOCK' || status === 'INACTIVE' || status === 'DELETED';
  const canRestore = status === 'INACTIVE' || status === 'DELETED';

  return (
    <div
      className={`group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-green-100 transition-all duration-300 flex flex-col overflow-hidden relative ${dimmed ? 'opacity-75' : ''}`}
    >
      {/* Image Area */}
      <div className="relative aspect-[4/3] w-full bg-gray-100 overflow-hidden">
        <Image
          src={product.images?.[0] ?? '/placeholder.png'}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-700"
        />

        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 backdrop-blur-[2px]">
          <button
            type="button"
            onClick={() => onEdit(product.id)}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-green-600 hover:bg-green-600 hover:text-white shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
            title="Chỉnh sửa"
            aria-label="Chỉnh sửa"
          >
            <Edit size={18} />
          </button>

          {canRestock && onRestock && (
            <button
              type="button"
              onClick={() => onRestock(product.id)}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-amber-600 hover:bg-amber-500 hover:text-white shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-75"
              title="Nhập thêm hàng"
              aria-label="Nhập thêm hàng"
            >
              <PackagePlus size={18} />
            </button>
          )}

          {canRestore && onRestore && (
            <button
              type="button"
              onClick={() => onRestore(product.id)}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-100"
              title="Khôi phục"
              aria-label="Khôi phục"
            >
              <RotateCcw size={18} />
            </button>
          )}

          {status !== 'DELETED' && (
            <button
              type="button"
              onClick={() => onDelete(product.id)}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-150"
              title="Xóa (ẩn khỏi gian hàng)"
              aria-label="Xóa"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md ${badge.cls}`}
          >
            {badge.label}
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-1">
        <div className="mb-3">
          <h3
            className="font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-green-600 transition-colors cursor-pointer"
            onClick={() => onEdit(product.id)}
          >
            {product.name}
          </h3>
          <p className="text-xs text-gray-400 mt-1 font-mono">#{product.id.slice(-8).toUpperCase()}</p>
        </div>

        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-extrabold text-green-600">
              {price.toLocaleString()}đ
            </span>
            {product.rating !== undefined && (
              <div className="flex items-center gap-1 text-xs font-medium text-yellow-500 bg-yellow-50 px-2 py-1 rounded-md">
                <Star size={12} fill="currentColor" />
                <span>{Number(product.rating).toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-50">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Package size={14} className="text-gray-400" />
              <span>
                Kho: <b className={`${product.stock <= 0 ? 'text-amber-600' : 'text-gray-800'}`}>{product.stock}</b>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 justify-end">
              <Eye size={14} className="text-gray-400" />
              <span>Bán: <b className="text-gray-800">{product.sold ?? 0}</b></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

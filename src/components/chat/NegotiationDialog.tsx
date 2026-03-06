'use client';

import React, { useState } from 'react';
import { X, Handshake, AlertCircle } from 'lucide-react';

interface Props {
  product: {
    id:                  string;
    name:                string;
    unit:                string;
    min_negotiation_qty: number;
  };
  onConfirm: (quantity: number) => void;
  onClose:   () => void;
}

export const NegotiationDialog = ({ product, onConfirm, onClose }: Props) => {
  const [qty,   setQty]   = useState<string>(String(product.min_negotiation_qty));
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const num = Number(qty);
    if (!qty || isNaN(num) || num <= 0) {
      setError('Vui lòng nhập số lượng hợp lệ');
      return;
    }
    if (num < product.min_negotiation_qty) {
      setError(
        `Số lượng tối thiểu để thương lượng là ${product.min_negotiation_qty} ${product.unit}`
      );
      return;
    }
    onConfirm(num);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
              <Handshake size={18} className="text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Thương lượng giá</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Notice */}
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-4 text-sm text-green-800 leading-relaxed">
          <strong>{product.name}</strong> chỉ được thương lượng khi mua từ{' '}
          <strong>{product.min_negotiation_qty} {product.unit}</strong> trở lên.
        </div>

        {/* Input */}
        <div className="mb-5">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Bạn muốn mua bao nhiêu {product.unit}?
          </label>
          <input
            type="number"
            value={qty}
            onChange={e => { setQty(e.target.value); setError(''); }}
            min={product.min_negotiation_qty}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none text-lg font-bold"
            placeholder={`Tối thiểu ${product.min_negotiation_qty} ${product.unit}`}
          />
          {error && (
            <div className="flex items-center gap-1.5 mt-2 text-red-600 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-sm"
          >
            Xác nhận &amp; Chat
          </button>
        </div>
      </div>
    </div>
  );
};

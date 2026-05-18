'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSellerProducts, ProductStatus } from '@/hooks/useSellerProducts';
import { Search, Plus, SlidersHorizontal, ArrowUpDown, Package, Loader2 } from 'lucide-react';
import { SellerProductCard } from '@/components/seller/products/SellerProductCard';

// Status filter tabs — order matches likely workflow (focus on sellable first,
// then problems, then archive). "ALL" shows everything except DELETED so the
// archive doesn't drown out the active stock.
const FILTER_TABS: { key: 'ALL' | ProductStatus; label: string }[] = [
  { key: 'ALL',          label: 'Tất cả' },
  { key: 'ACTIVE',       label: 'Đang bán' },
  { key: 'OUT_OF_STOCK', label: 'Hết hàng' },
  { key: 'INACTIVE',     label: 'Tạm ẩn' },
  { key: 'DELETED',      label: 'Đã xóa' },
];

export default function ProductManagementPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | ProductStatus>('ALL');
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    products, loading, error,
    fetchProducts, deleteProduct, restockProduct, setProductStatus,
  } = useSellerProducts();

  useEffect(() => { fetchProducts(); }, []); // eslint-disable-line

  // Count per status — used to decorate the tabs and to short-circuit empty states
  const counts = useMemo(() => {
    const c: Record<'ALL' | ProductStatus, number> = {
      ALL: 0, ACTIVE: 0, OUT_OF_STOCK: 0, INACTIVE: 0, DELETED: 0,
    };
    for (const p of products) {
      const s = (p.status ?? (p.stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK')) as ProductStatus;
      c[s] += 1;
      if (s !== 'DELETED') c.ALL += 1;
    }
    return c;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return products.filter((p) => {
      const s = (p.status ?? (p.stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK')) as ProductStatus;
      if (activeTab === 'ALL' ? s === 'DELETED' : s !== activeTab) return false;
      return p.name.toLowerCase().includes(q);
    });
  }, [products, searchTerm, activeTab]);

  const handleDelete = async (id: string) => {
    if (!confirm('Xác nhận ẩn sản phẩm này? Bạn có thể khôi phục lại ở tab "Đã xóa".')) return;
    setActionError(null);
    try { await deleteProduct(id); }
    catch (e: any) { setActionError(e?.response?.data?.message || 'Không thể xóa sản phẩm.'); }
  };

  const handleRestock = async (id: string) => {
    const raw = prompt('Nhập số lượng cần nhập thêm vào kho:');
    if (raw === null) return;
    const add = Number(raw);
    if (!Number.isFinite(add) || add <= 0) {
      setActionError('Số lượng nhập thêm phải là một số dương.');
      return;
    }
    setActionError(null);
    try { await restockProduct(id, { add }); }
    catch (e: any) { setActionError(e?.response?.data?.message || 'Không thể nhập thêm hàng.'); }
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Khôi phục sản phẩm? Sản phẩm sẽ chuyển về trạng thái Đang bán nếu còn hàng.')) return;
    setActionError(null);
    try { await setProductStatus(id, 'ACTIVE'); }
    catch (e: any) { setActionError(e?.response?.data?.message || 'Không thể khôi phục sản phẩm.'); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Sản phẩm</h1>
          <p className="text-gray-500 mt-2 font-medium">Quản lý kho hàng và danh mục sản phẩm của bạn.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/products/create')}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all active:scale-95"
        >
          <Plus size={20} /> Thêm sản phẩm mới
        </button>
      </div>

      {/* 2. Status tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
                active
                  ? 'bg-green-600 text-white border-green-600 shadow-sm shadow-green-600/20'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`ml-2 inline-flex items-center justify-center text-[10px] font-bold rounded-full min-w-[20px] px-1.5 py-0.5 ${
                active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {counts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Toolbar (Search & Filter) */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, mã SKU..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button type="button" className="px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 flex items-center gap-2 transition-colors">
            <SlidersHorizontal size={18} /> Bộ lọc
          </button>
          <button type="button" className="px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 flex items-center gap-2 transition-colors">
            <ArrowUpDown size={18} /> Sắp xếp
          </button>
        </div>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-medium px-4 py-3 rounded-xl">
          {actionError}
        </div>
      )}

      {/* 4. Product Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-32">
          <Loader2 className="animate-spin text-green-500" size={36} />
        </div>
      ) : error ? (
        <div className="text-center py-32 text-red-500 bg-white rounded-3xl border border-dashed border-red-200">
          <p className="font-bold">Không thể tải sản phẩm</p>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={fetchProducts} className="mt-4 text-sm text-green-600 font-bold hover:underline">Thử lại</button>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <SellerProductCard
              key={product.id}
              product={product}
              onEdit={(id) => router.push(`/dashboard/products/${id}`)}
              onDelete={handleDelete}
              onRestock={handleRestock}
              onRestore={handleRestore}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package size={32} className="text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Không tìm thấy sản phẩm</h3>
          <p className="text-gray-500">Thử thay đổi từ khóa tìm kiếm hoặc chuyển sang tab khác.</p>
        </div>
      )}
    </div>
  );
}

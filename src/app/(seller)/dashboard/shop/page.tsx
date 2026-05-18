'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { MAX_SHOP_BANNERS, useSellerShop } from '@/hooks/useSellerShop';
import { Camera, Save, MapPin, Store, ImageIcon, Globe, Loader2, Phone, ExternalLink, Link2, Plus, Trash2 } from 'lucide-react';

// Defensive: a `http(s)://` value that ended up in the address field is not
// a human-readable label — skip it so the seller preview never shows a raw URL.
const isUrlLike = (v: unknown) => typeof v === 'string' && /^https?:\/\//i.test(v.trim());
const cleanLabel = (v: unknown) =>
  typeof v === 'string' && v.trim() && !isUrlLike(v) ? v.trim() : '';

// Priority order matches the buyer-facing display:
//   shop_location_name → store_address → 'Xem vị trí'
function pickLocationLabel(locationName: string, address: string): string {
  return cleanLabel(locationName) || cleanLabel(address) || 'Xem vị trí';
}

// Validate-only (matches BE rules) so the FE can give immediate feedback before save.
function isGoogleMapsUrl(raw: string): boolean {
  if (!raw) return false;
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (host === 'maps.app.goo.gl' || host === 'goo.gl' || host === 'maps.google.com') return true;
    return /(^|\.)google\.[a-z.]+$/.test(host) && u.pathname.startsWith('/maps');
  } catch {
    return false;
  }
}

function buildMapsOpenUrl(opts: { url?: string; lat?: number | null; lng?: number | null; address?: string }) {
  if (opts.url) return opts.url;
  if (opts.lat != null && opts.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${opts.lat},${opts.lng}`;
  }
  if (opts.address && opts.address.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(opts.address.trim())}`;
  }
  return '';
}

interface ShopForm {
  store_name: string;
  store_description: string;
  store_address: string;
  store_phone: string;
  shop_location_name: string;
  shop_google_maps_url: string;
}

export default function ShopProfilePage() {
  const { shop, loading, updateShop, addBanner, removeBanner } = useSellerShop();
  const [form, setForm] = useState<ShopForm>({
    store_name: '', store_description: '', store_address: '', store_phone: '',
    shop_location_name: '', shop_google_maps_url: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [bannerBusy, setBannerBusy] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (shop) {
      setForm({
        store_name: shop.store_name || '',
        store_description: shop.store_description || '',
        store_address: shop.store_address || '',
        store_phone: shop.store_phone || '',
        shop_location_name: shop.shop_location_name || '',
        shop_google_maps_url: shop.shop_google_maps_url || '',
      });
      setAvatarPreview(shop.avatar_url || '');
    }
  }, [shop]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so re-picking the same file still fires onChange.
    e.target.value = '';
    if (!file) return;
    if ((shop?.banners.length ?? 0) >= MAX_SHOP_BANNERS) {
      setBannerError(`Tối đa ${MAX_SHOP_BANNERS} banner — hãy xóa bớt trước khi thêm.`);
      return;
    }
    setBannerBusy(true); setBannerError('');
    try {
      await addBanner(file);
    } catch (err: any) {
      setBannerError(err.message || 'Lỗi khi tải banner.');
    } finally {
      setBannerBusy(false);
    }
  };

  const handleBannerDelete = async (idx: number) => {
    const banner = shop?.banners[idx];
    if (!banner) return;
    setBannerBusy(true); setBannerError('');
    try {
      await removeBanner(banner);
    } catch (err: any) {
      setBannerError(err.message || 'Lỗi khi xóa banner.');
    } finally {
      setBannerBusy(false);
    }
  };

  const handleSave = async () => {
    // Front-end URL validation — matches BE so we fail fast with a clear message
    if (form.shop_google_maps_url && !isGoogleMapsUrl(form.shop_google_maps_url)) {
      setSaveError('URL Google Maps không hợp lệ. Hãy dán link có dạng https://www.google.com/maps/... hoặc https://maps.app.goo.gl/...');
      return;
    }
    setIsSaving(true); setSaveError('');
    try {
      await updateShop(form, avatarFile ?? undefined);
      setAvatarFile(null);
    } catch (e: any) {
      setSaveError(e.message || 'Lỗi khi lưu');
    } finally {
      setIsSaving(false);
    }
  };

  // Live preview of where the buyer click will go — recomputed from current form
  // values so the seller can see the URL change as they type/paste.
  const previewMapsUrl = buildMapsOpenUrl({
    url: form.shop_google_maps_url,
    lat: shop?.shop_latitude ?? null,
    lng: shop?.shop_longitude ?? null,
    address: form.store_address,
  });

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <Loader2 className="animate-spin text-green-500" size={36} />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hồ sơ Shop</h1>
          <p className="text-gray-500 mt-2 font-medium">Thiết lập thông tin hiển thị và trang trí gian hàng của bạn.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {saveError && <p className="text-sm text-red-500">{saveError}</p>}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all active:scale-95 disabled:opacity-70"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* CỘT TRÁI */}
        <div className="xl:col-span-1 space-y-8">

          {/* Box 1: Avatar & Tên Shop */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-green-50 to-emerald-100 z-0"></div>

            {/* Avatar */}
            <div className="relative z-10 mb-6 group">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-white relative">
                {avatarPreview
                  ? <Image src={avatarPreview} alt="avatar" fill className="object-cover" />
                  : <div className="w-full h-full bg-green-100 flex items-center justify-center text-green-600 text-4xl font-bold">{form.store_name?.charAt(0) || 'S'}</div>
                }
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[1px]">
                  <Camera className="text-white mb-1" size={24} />
                  <span className="text-[10px] text-white font-bold uppercase">Đổi ảnh</span>
                </div>
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarUpload} accept="image/*" />
              </div>
              <div className="absolute bottom-1 right-1 bg-green-500 border-2 border-white rounded-full p-1.5 text-white shadow-sm">
                <Store size={14} />
              </div>
            </div>

            {/* Inputs */}
            <div className="w-full space-y-5 z-10 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Tên gian hàng</label>
                <input
                  type="text"
                  value={form.store_name}
                  onChange={e => setForm({ ...form, store_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none font-bold text-gray-900 transition-all"
                />
              </div>
              {/* "Địa chỉ kho hàng" đã được chuyển sang phần "Vị trí trên Google Maps"
                  để tránh trùng lặp — store_address vẫn được giữ trong form state
                  như fallback cho buildMapsOpenUrl khi seller chưa dán link. */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Số điện thoại</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={form.store_phone}
                    onChange={e => setForm({ ...form, store_phone: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none font-medium transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Box 2: Giới thiệu */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <Globe size={20} className="text-blue-500" /> Giới thiệu Shop
            </h3>
            <textarea
              rows={5}
              value={form.store_description}
              onChange={e => setForm({ ...form, store_description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none text-gray-600 leading-relaxed transition-all"
              placeholder="VD: Chuyên cung cấp nông sản sạch Đà Lạt, cam kết VietGAP..."
            />
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div className="xl:col-span-2 space-y-8">

          {/* Box 3: Vị trí Google Maps */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-5">
            <div>
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <MapPin size={20} className="text-red-500" /> Vị trí trên Google Maps
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Dán link Google Maps của gian hàng — người mua bấm vào địa chỉ sẽ mở thẳng Google Maps.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Tên địa điểm hiển thị</label>
              <input
                type="text"
                value={form.shop_location_name}
                onChange={(e) => setForm({ ...form, shop_location_name: e.target.value })}
                placeholder="VD: Nông trại Đà Lạt - Cầu Đất"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none font-medium transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Link Google Maps</label>
              <div className="relative">
                <Link2 className="absolute left-4 top-3.5 text-gray-400" size={18} />
                <input
                  type="url"
                  value={form.shop_google_maps_url}
                  onChange={(e) => setForm({ ...form, shop_google_maps_url: e.target.value })}
                  placeholder="https://www.google.com/maps/place/..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none font-medium transition-all"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Mở Google Maps → bấm <b>Chia sẻ</b> → <b>Sao chép liên kết</b> rồi dán vào đây.
                Có thể dùng link rút gọn <code>maps.app.goo.gl</code>.
              </p>
            </div>

            {/* Live preview of what the buyer will see + click target.
                Text follows the same priority chain as the buyer page:
                shop_location_name → store_address → 'Xem vị trí'. */}
            {previewMapsUrl ? (
              <a
                href={previewMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors group"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <MapPin size={16} className="flex-shrink-0" />
                  <span className="truncate">
                    {pickLocationLabel(form.shop_location_name, form.store_address)}
                  </span>
                </span>
                <ExternalLink size={14} className="flex-shrink-0 opacity-60 group-hover:opacity-100" />
              </a>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Chưa có link Google Maps hoặc địa chỉ — nhập một trong hai để người mua mở được Google Maps.
              </p>
            )}
          </div>

          {/* Box 4: Banners (tối đa 3) */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <ImageIcon size={20} className="text-purple-500" />
                Banner Gian Hàng
              </h3>
              <span className="text-xs font-bold text-gray-500">
                {(shop?.banners.length ?? 0)} / {MAX_SHOP_BANNERS}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Tối đa {MAX_SHOP_BANNERS} ảnh. Banner hiển thị giữa thông tin shop và danh sách sản phẩm trên trang mua hàng.
            </p>
            {bannerError && (
              <p className="text-sm text-red-500 mb-3">{bannerError}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: MAX_SHOP_BANNERS }).map((_, idx) => {
                const banner = shop?.banners[idx];
                if (banner) {
                  return (
                    <div
                      key={banner.raw}
                      className="relative aspect-[3/1] rounded-xl overflow-hidden border border-gray-200 shadow-sm group"
                    >
                      <Image src={banner.url} alt={`banner ${idx + 1}`} fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => handleBannerDelete(idx)}
                        disabled={bannerBusy}
                        className="absolute top-2 right-2 bg-white/90 hover:bg-red-500 hover:text-white text-red-500 p-2 rounded-full shadow-sm transition-colors disabled:opacity-60"
                        title="Xóa banner"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                }
                const disabled = bannerBusy || (shop?.banners.length ?? 0) >= MAX_SHOP_BANNERS;
                return (
                  <label
                    key={`empty-${idx}`}
                    className={`block aspect-[3/1] rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all group ${
                      disabled
                        ? 'border-gray-100 bg-gray-50/40 cursor-not-allowed opacity-60'
                        : 'border-gray-200 cursor-pointer hover:border-green-500 hover:bg-green-50/50'
                    }`}
                  >
                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2 group-hover:bg-white group-hover:shadow-sm transition">
                      {bannerBusy ? (
                        <Loader2 className="text-gray-400 animate-spin" size={18} />
                      ) : (
                        <Plus className="text-gray-400 group-hover:text-green-600" size={18} />
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-500 group-hover:text-green-700">Thêm banner</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">PNG, JPG · 3:1</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      disabled={disabled}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


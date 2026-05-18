import { useState, useCallback, useEffect } from 'react';
import api from '@/lib/axios';
import { API_BASE_URL, resolveBackendUrl } from '@/lib/runtime-config';

export const MAX_SHOP_BANNERS = 3;

export interface SellerShopBanner {
  /** Raw path the BE stores in Profile.banners1 (e.g. /uploads/avatars/xxx.png). */
  raw: string;
  /** Absolute URL ready for <Image src=...>. */
  url: string;
}

export interface SellerShopProfile {
  id: string;
  store_name: string;
  store_description?: string;
  store_address?: string;
  store_phone?: string;
  avatar_url?: string;
  banner_url?: string;
  /** Carousel banners (max 3) — shown between info and products on the buyer shop page. */
  banners: SellerShopBanner[];
  rating?: number;
  total_products?: number;
  total_orders?: number;
  created_at?: string;

  // ─── Shop location (Google Maps) ────────────────────────────────────────
  shop_location_name?: string;
  shop_google_maps_url?: string;
  shop_latitude?: number | null;
  shop_longitude?: number | null;
  shop_maps_open_url?: string | null;
}

export interface ShopUpdatePayload {
  store_name?: string;
  store_description?: string;
  store_address?: string;
  store_phone?: string;
  shop_location_name?: string;
  shop_google_maps_url?: string;
  shop_latitude?: number | null;
  shop_longitude?: number | null;
}

export function useSellerShop() {
  const [shop, setShop]       = useState<SellerShopProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchShop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/profile/me');
      const d = res.data;
      const p = d.profile ?? {};
      const rawBanners: string[] = Array.isArray(p.banners1) ? p.banners1.slice(0, MAX_SHOP_BANNERS) : [];
      setShop({
        id:                   d.id,
        store_name:           p.store_name        || d.full_name || '',
        store_description:    p.description       || '',
        store_address:        p.address           || '',
        store_phone:          d.phone_number      || '',
        // Guard: if BE already returns a full URL, don't double-prefix
        avatar_url:           resolveBackendUrl(d.avatar),
        banner_url:           p.cover_url         || '',
        banners:              rawBanners.map((raw) => ({ raw, url: resolveBackendUrl(raw) })),
        rating:               p.rating            || 0,
        shop_location_name:   p.shop_location_name   || '',
        shop_google_maps_url: p.shop_google_maps_url || '',
        shop_latitude:        p.shop_latitude ?? null,
        shop_longitude:       p.shop_longitude ?? null,
        shop_maps_open_url:   p.shop_maps_open_url ?? null,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi tải thông tin shop');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShop(); }, [fetchShop]);

  const updateShop = async (
    data: ShopUpdatePayload,
    avatarFile?: File,
  ) => {
    setSaving(true);
    try {
      // Translate FE form keys → BE DTO keys. We pass through empty strings
      // for store_address / shop_google_maps_url so the seller can clear them.
      const payload: Record<string, any> = {};
      if (data.store_name !== undefined)           payload.store_name           = data.store_name;
      if (data.store_description !== undefined)    payload.description          = data.store_description;
      if (data.store_address !== undefined)        payload.address              = data.store_address;
      if (data.store_phone !== undefined)          payload.phone_number         = data.store_phone;
      if (data.shop_location_name !== undefined)   payload.shop_location_name   = data.shop_location_name;
      if (data.shop_google_maps_url !== undefined) payload.shop_google_maps_url = data.shop_google_maps_url;
      if (data.shop_latitude !== undefined)        payload.shop_latitude        = data.shop_latitude;
      if (data.shop_longitude !== undefined)       payload.shop_longitude       = data.shop_longitude;

      await api.patch('/profile/me', payload);

      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        const av = await api.post('/profile/me/avatar', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (av.data?.avatar) {
          setShop((prev) => prev ? { ...prev, avatar_url: resolveBackendUrl(av.data.avatar) } : prev);
        }
      }

      await fetchShop();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Lỗi khi cập nhật shop');
    } finally {
      setSaving(false);
    }
  };

  // ─── Banner manager ─────────────────────────────────────────────────────
  // The BE caps Profile.banners1 at 3. We pre-check on the FE so the seller
  // gets immediate feedback instead of a 400 round-trip.
  const addBanner = async (file: File) => {
    if ((shop?.banners.length ?? 0) >= MAX_SHOP_BANNERS) {
      throw new Error(`Tối đa ${MAX_SHOP_BANNERS} banner.`);
    }
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post('/profile/me/banners', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchShop();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Lỗi khi tải banner.');
    }
  };

  const removeBanner = async (banner: SellerShopBanner) => {
    // BE stores relative paths; if we somehow have an absolute URL, strip the API base.
    const raw = banner.raw.startsWith(API_BASE_URL)
      ? banner.raw.slice(API_BASE_URL.length)
      : banner.raw;
    try {
      await api.delete('/profile/me/banners', { data: { url: raw } });
      await fetchShop();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Lỗi khi xóa banner.');
    }
  };

  return { shop, loading, saving, error, fetchShop, updateShop, addBanner, removeBanner, setShop };
}

import api from '@/lib/axios';

// ─── Types khớp response BE /admin/* ────────────────────────────────────────
export interface DashboardData {
  users: { total: number; buyers: number; sellers: number; admins: number };
  products: { active: number; total: number };
  orders: { total: number; completed: number; byStatus: { status: string; count: number }[] };
  revenue: number;
  unverifiedShops: number;
  /** @deprecated Use unverifiedShops. */
  pendingShops: number;
  openDisputes: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  is_buyer: boolean;
  is_seller: boolean;
  is_admin: boolean;
  is_active: boolean;
  verified_email: boolean;
  created_at: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  reference_price: string;
  stock_quantity: string;
  unit: string;
  status: 'ACTIVE' | 'OUT_OF_STOCK' | 'INACTIVE' | 'DELETED';
  is_active: boolean;
  created_at: string;
  seller: { id: string; full_name: string; email: string };
  category: { id: number; name: string };
}

export interface UnverifiedShop {
  id: string;
  store_name: string | null;
  address: string | null;
  description: string | null;
  shop_location_name: string | null;
  shop_google_maps_url: string | null;
  created_at: string;
  user: { id: string; email: string; full_name: string };
}

export type DisputeStatus = 'PENDING_SELLER_RESPONSE' | 'UNDER_ADMIN_REVIEW' | 'RESOLVED' | 'CLOSED';
export type DisputeOutcome = 'PENDING' | 'SELLER_FAULT' | 'BUYER_FAULT' | 'SHIPPING_FAULT' | 'INSUFFICIENT_EVIDENCE';
export type ResolutionAction =
  | 'NONE'
  | 'REFUND_BUYER'
  | 'RELEASE_PAYMENT_TO_SELLER'
  | 'PARTIAL_REFUND'
  | 'CLOSE_WITHOUT_ACTION';

interface Party {
  id: string;
  full_name: string;
  email: string;
}

export interface DisputeListItem {
  id: string;
  status: DisputeStatus;
  outcome: DisputeOutcome;
  action_taken: ResolutionAction;
  created_at: string;
  buyer: Party;
  seller: Party;
  order: { id: string; status: string; final_total_price: string; payment_method: string };
}

export interface DisputeDetail extends DisputeListItem {
  buyer_reason: string;
  buyer_images: string[];
  buyer_video: string | null;
  seller_explanation: string | null;
  seller_images: string[];
  seller_video: string | null;
  admin_notes: string | null;
  resolved_at: string | null;
  order: DisputeListItem['order'] & {
    order_items: { id: string; quantity: string; negotiated_price: string; product: { id: string; name: string } }[];
    payments: { id: string; amount: string; payment_method: string; status: string }[];
  };
}

// ─── 360° user details ───────────────────────────────────────────────────────
export interface UserDetailUser {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  verified_email: boolean;
  is_active: boolean;
  is_admin: boolean;
  is_buyer: boolean;
  is_seller: boolean;
  created_at: string;
}
interface RecentOrder {
  id: string;
  status: string;
  final_total_price: string;
  created_at: string;
  seller?: { id: string; full_name: string };
  buyer?: { id: string; full_name: string };
}
interface RecentProductRow {
  id: string;
  name: string;
  reference_price: string;
  stock_quantity: string;
  unit: string;
  status: string;
  created_at: string;
}
export interface BuyerSummary {
  totalOrders: number;
  totalSpent: number;
  ordersByStatus: Record<string, number>;
  recentOrders: RecentOrder[];
  reviewsWrittenCount: number;
}
export interface SellerSummary {
  totalProducts: number;
  productsByStatus: Record<string, number>;
  totalSoldOrders: number;
  totalRevenue: number;
  ordersByStatus: Record<string, number>;
  recentProducts: RecentProductRow[];
  recentSales: RecentOrder[];
}
export interface UserDetails {
  user: UserDetailUser;
  buyerSummary: BuyerSummary;
  sellerSummary: SellerSummary;
}

// ─── 360° product details ─────────────────────────────────────────────────────
export interface ProductDetails {
  product: {
    id: string;
    name: string;
    description: string | null;
    reference_price: string;
    stock_quantity: string;
    unit: string;
    location: string | null;
    certification: string | null;
    min_negotiation_qty: string | null;
    status: 'ACTIVE' | 'OUT_OF_STOCK' | 'INACTIVE' | 'DELETED';
    is_active: boolean;
    created_at: string;
    updated_at: string;
    seller: {
      id: string;
      full_name: string;
      email: string;
      profile: { store_name: string | null; address: string | null; is_verified: boolean } | null;
    };
    category: { id: number; name: string };
  };
  images: string[];
  stats: { soldQuantity: number; completedOrderItems: number; timesOrdered: number };
}

// ─── API calls ───────────────────────────────────────────────────────────────
export const adminApi = {
  dashboard: () => api.get<DashboardData>('/admin/analytics/dashboard').then((r) => r.data),

  listUsers: (params: { page?: number; limit?: number; search?: string }) =>
    api.get<Paginated<AdminUser>>('/admin/users', { params }).then((r) => r.data),
  userDetails: (id: string) => api.get<UserDetails>(`/admin/users/${id}/details`).then((r) => r.data),
  setUserStatus: (id: string, is_active: boolean) =>
    api.patch(`/admin/users/${id}/status`, { is_active }).then((r) => r.data),

  unverifiedShops: () => api.get<UnverifiedShop[]>('/admin/shops/unverified').then((r) => r.data),
  verifyShop: (userId: string, is_verified: boolean) =>
    api.patch(`/admin/shops/${userId}/verify`, { is_verified }).then((r) => r.data),

  listProducts: (params: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get<Paginated<AdminProduct>>('/admin/products', { params }).then((r) => r.data),
  productDetails: (id: string) => api.get<ProductDetails>(`/admin/products/${id}/details`).then((r) => r.data),
  moderateProduct: (id: string, status: 'ACTIVE' | 'INACTIVE', reason?: string) =>
    api.patch(`/admin/products/${id}/moderation`, { status, reason }).then((r) => r.data),

  listDisputes: (params: { status?: string; page?: number; limit?: number }) =>
    api.get<Paginated<DisputeListItem>>('/admin/disputes', { params }).then((r) => r.data),
  getDispute: (id: string) => api.get<DisputeDetail>(`/admin/disputes/${id}`).then((r) => r.data),
  adjudicate: (id: string, body: { outcome: DisputeOutcome; action_taken: ResolutionAction; admin_notes?: string }) =>
    api.post(`/admin/disputes/${id}/adjudicate`, body).then((r) => r.data),
};

export const formatVnd = (v: number | string) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));

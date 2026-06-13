import api from '@/lib/axios';

export type DisputeStatus = 'PENDING_SELLER_RESPONSE' | 'UNDER_ADMIN_REVIEW' | 'RESOLVED' | 'CLOSED';

export interface MyDispute {
  id: string;
  status: DisputeStatus;
  outcome: string;
  buyer_id: string;
  seller_id: string;
  buyer_reason: string;
  buyer_images: string[];
  seller_explanation: string | null;
  seller_images: string[];
  order: { id: string; status: string; final_total_price: string };
}

// Upload 1 ảnh bằng chứng → trả URL. Tái dùng endpoint /chat/upload-image (field `image`).
export async function uploadEvidenceImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('image', file);
  const res = await api.post('/chat/upload-image', fd);
  const url = res.data?.url;
  if (!url) throw new Error('Upload ảnh thất bại.');
  return url as string;
}

export const disputeApi = {
  uploadEvidenceImage,
  create: (orderId: string, body: { reason: string; images?: string[] }) =>
    api.post(`/disputes/order/${orderId}`, body).then((r) => r.data),
  respond: (disputeId: string, body: { explanation: string; images?: string[] }) =>
    api.patch(`/disputes/${disputeId}/respond`, body).then((r) => r.data),
  mine: () => api.get<MyDispute[]>('/disputes/mine').then((r) => r.data),
  // Tìm dispute theo orderId (cho seller respond mà không cần truyền disputeId).
  byOrder: async (orderId: string): Promise<MyDispute | undefined> => {
    const list = await api.get<MyDispute[]>('/disputes/mine').then((r) => r.data);
    return list.find((d) => d.order.id === orderId);
  },
};

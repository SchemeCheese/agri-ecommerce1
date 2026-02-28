import { useState, useCallback } from 'react';
import api from '@/lib/axios';

export interface SellerReview {
  id: string;
  rating: number;
  comment?: string;
  images?: string[];
  created_at: string;
  seller_reply?: string;
  replied_at?: string;
  buyer: {
    id: string;
    full_name: string;
    avatar?: string;
  };
  products: {
    id: string;
    name: string;
    images: string[];
  }[];
  order_id?: string;
}

export interface ReviewStats {
  average: number;
  total: number;
  repliedCount: number;
  starBreakdown: Record<number, number>;
}

export function useSellerReviews() {
  const [reviews, setReviews]     = useState<SellerReview[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/reviews/shop-reviews');
      setReviews(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi tải đánh giá');
    } finally {
      setLoading(false);
    }
  }, []);

  const replyReview = async (reviewId: string, reply: string) => {
    const res = await api.post(`/reviews/${reviewId}/reply`, { reply });
    // Cập nhật local state ngay lập tức
    setReviews(prev =>
      prev.map(r =>
        r.id === reviewId
          ? { ...r, seller_reply: reply, replied_at: new Date().toISOString() }
          : r
      )
    );
    return res.data;
  };

  const stats: ReviewStats = {
    average: reviews.length > 0
      ? Number((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1))
      : 0,
    total: reviews.length,
    repliedCount: reviews.filter(r => r.seller_reply).length,
    starBreakdown: [1, 2, 3, 4, 5].reduce((acc, s) => {
      acc[s] = reviews.filter(r => Math.round(r.rating) === s).length;
      return acc;
    }, {} as Record<number, number>),
  };

  return { reviews, loading, error, fetchReviews, replyReview, stats };
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Store, ArrowRight, Loader2 } from 'lucide-react';

export default function BecomeSellerPage() {
  const router = useRouter();
  const { user, isLoading, becomeSeller } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login?returnUrl=/become-seller');
    } else if (user?.is_seller) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    const updated = await becomeSeller();
    if (updated && updated.is_seller) {
      router.push('/dashboard/shop');
    } else {
      setError('Không thể kích hoạt vai trò bán hàng. Vui lòng thử lại.');
      setSubmitting(false);
    }
  };

  if (isLoading || !user || user.is_seller) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-green-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8">
        <div className="w-16 h-16 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mb-6">
          <Store size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mở gian hàng trên Agri-Connect</h1>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Sau khi xác nhận, tài khoản của bạn sẽ được kích hoạt thêm vai trò Người bán.
          Bạn vẫn dùng được chức năng mua hàng như bình thường, đồng thời được quyền:
        </p>
        <ul className="space-y-2 mb-6 text-sm text-gray-700">
          <li>• Đăng & quản lý sản phẩm</li>
          <li>• Nhận đơn, xử lý đơn hàng</li>
          <li>• Chat thương lượng giá với người mua</li>
          <li>• Tạo voucher giảm giá riêng cho shop</li>
        </ul>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            ⚠️ {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
          >
            Để sau
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>Đăng ký bán hàng <ArrowRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

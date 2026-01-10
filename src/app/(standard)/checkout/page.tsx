"use client";

import { useState, useEffect, Suspense } from 'react'; 
import { useCartStore } from '@/store/useCartStore';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatCurrency } from '@/utils/vi';

function CheckoutContent() {
  const { items, clearCart } = useCartStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [mounted, setMounted] = useState(false);
  const [buyingItems, setBuyingItems] = useState<typeof items>([]);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    note: ''
  });

  useEffect(() => {
    setMounted(true);
    
    const idsParam = searchParams.get('ids');
    
    if (items.length === 0) {
      router.push('/');
      return;
    }

    if (idsParam) {
      const selectedIds = idsParam.split(',');
      const filteredItems = items.filter(item => selectedIds.includes(item.id));
      setBuyingItems(filteredItems);
      
      if (filteredItems.length === 0) router.push('/cart');
    } else {
      setBuyingItems(items);
    }

  }, [items, router, searchParams]);

  const totalAmount = buyingItems.reduce((total, item) => total + item.price * item.quantity, 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOrder = (e: React.FormEvent) => {
    e.preventDefault();
    
    const orderData = {
      customer: formData,
      products: buyingItems, 
      total: totalAmount,
      date: new Date().toISOString()
    };
    
    console.log("Đơn hàng gửi đi:", orderData);

    alert("Đặt hàng thành công!");
    
    clearCart(); 
    
    router.push('/'); 
  };

  if (!mounted || buyingItems.length === 0) return <div className="p-10 text-center">Đang tải đơn hàng...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center text-green-700">Xác nhận đơn hàng</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-6 flex items-center text-gray-800">
              <span className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
              Thông tin giao hàng
            </h2>
            
            <form id="checkout-form" onSubmit={handleOrder} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                  <input 
                    required 
                    name="fullName"
                    type="text" 
                    placeholder="Nguyễn Văn A" 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input 
                    required 
                    name="phone"
                    type="tel" 
                    placeholder="0912..." 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ nhận hàng</label>
                <input 
                  required 
                  name="address"
                  type="text" 
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện..." 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (tùy chọn)</label>
                <textarea 
                  name="note"
                  rows={3} 
                  placeholder="Ví dụ: Giao hàng giờ hành chính..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  onChange={handleInputChange}
                ></textarea>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 sticky top-4">
            <h2 className="text-xl font-bold mb-6 flex items-center text-gray-800">
               <span className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
               Đơn hàng ({buyingItems.length} món)
            </h2>
            
            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {buyingItems.map((item) => (
                <div key={item.id} className="flex items-start gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="relative w-16 h-16 flex-shrink-0 border rounded-md overflow-hidden bg-white">
                     <img 
                        src={Array.isArray(item.images) ? item.images[0] : item.images || '/placeholder.png'} 
                        alt={item.name} 
                        className="object-cover w-full h-full" 
                     />
                  </div>
                  
                  <div className="flex-grow">
                    <p className="font-semibold text-gray-800 text-sm line-clamp-2 mb-1">{item.name}</p>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">x{item.quantity}</span>
                        <span className="text-green-600 font-bold text-sm">
                            {formatCurrency(item.price * item.quantity)}
                        </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Phí vận chuyển:</span>
                <span className="text-green-600 font-medium">Miễn phí</span>
              </div>
              <div className="border-t border-dashed border-gray-300 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-800">Tổng cộng:</span>
                <span className="text-xl font-bold text-green-700">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <button 
              type="submit"
              form="checkout-form" 
              className="w-full mt-6 bg-green-600 text-white font-bold py-3.5 rounded-lg hover:bg-green-700 shadow-lg shadow-green-200 transition-all transform active:scale-95"
            >
              ĐẶT HÀNG NGAY
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Đang tải...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
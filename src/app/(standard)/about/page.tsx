// src/app/(standard)/about/page.tsx
import React from 'react';
import { Container } from '@/components/ui/Container';
import Image from 'next/image';
import { Leaf, ShieldCheck, Truck, Award } from 'lucide-react';

export default function AboutPage() {
  const values = [
    {
      icon: <Leaf size={32} className="text-green-600" />,
      title: '100% Hữu Cơ',
      description: 'Sản phẩm được canh tác theo tiêu chuẩn hữu cơ, không thuốc trừ sâu.',
    },
    {
      icon: <ShieldCheck size={32} className="text-green-600" />,
      title: 'Minh Bạch Nguồn Gốc',
      description: 'Truy xuất nguồn gốc rõ ràng, từ nông trại đến bàn ăn của bạn.',
    },
    {
      icon: <Truck size={32} className="text-green-600" />,
      title: 'Giao Hàng Nhanh',
      description: 'Giữ trọn độ tươi ngon khi giao đến tay khách hàng trong 24h.',
    },
    {
      icon: <Award size={32} className="text-green-600" />,
      title: 'Chất Lượng Hàng Đầu',
      description: 'Cam kết chất lượng, hoàn tiền 100% nếu sản phẩm không đạt chuẩn.',
    },
  ];

  return (
    <div className="bg-white">
      {/* 1. Hero Banner */}
      <section className="relative h-[400px] bg-gray-900 text-white">
        <Image
          src="/images/nongsan/about-banner.jpg" // Cần ảnh mới: /public/images/nongsan/about-banner.jpg
          alt="Vườn rau hữu cơ"
          layout="fill"
          objectFit="cover"
          className="opacity-50"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Container className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold">Về Agri-Ecommerce</h1>
            <p className="mt-4 text-lg max-w-2xl mx-auto">
              Mang tinh hoa nông sản Việt sạch, an toàn và tươi ngon nhất đến mọi gia đình.
            </p>
          </Container>
        </div>
      </section>

      {/* 2. Sứ mệnh của chúng tôi */}
      <section className="py-16 md:py-24">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative w-full h-80 rounded-lg overflow-hidden shadow-lg">
              <Image
                src="/images/nongsan/farmer.jpg" // Cần ảnh mới: /public/images/nongsan/farmer.jpg
                alt="Người nông dân"
                layout="fill"
                objectFit="cover"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Sứ Mệnh Của Chúng Tôi</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Chúng tôi tin rằng mọi người xứng đáng được thưởng thức những sản phẩm nông nghiệp
                tươi ngon và an toàn nhất. Sứ mệnh của Agri-Ecommerce là xây dựng cầu nối
                bền vững giữa những người nông dân tâm huyết và người tiêu dùng thành thị.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Bằng cách ứng dụng công nghệ, chúng tôi minh bạch hóa quy trình,
                tối ưu hóa vận hành để đảm bảo chất lượng và giữ trọn giá trị
                dinh dưỡng trong từng sản phẩm.
              </p>
            </div>
          </div>
        </Container>
      </section>
      
      {/* 3. Giá trị cốt lõi */}
      <section className="py-16 md:py-24 bg-green-50/50">
        <Container>
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Điều Chúng Tôi Cam Kết
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div key={value.title} className="text-center p-6 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
                  {value.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{value.title}</h3>
                <p className="text-sm text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 4. Quy trình (Placeholder) */}
      <section className="py-16 md:py-24">
         <Container>
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Quy Trình Của Chúng Tôi
          </h2>
           {/* Đây là nơi bạn có thể thêm một sơ đồ/timeline đơn giản */}
           <div className="text-center text-gray-500">
             {/* (Nội dung về quy trình: Thu hoạch -> Kiểm định -> Đóng gói -> Vận chuyển) */}
           </div>
         </Container>
      </section>
    </div>
  );
}
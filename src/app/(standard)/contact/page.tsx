// src/app/(standard)/contact/page.tsx
'use client'; // Cần 'use client' vì có form
import React from 'react';
import { Container } from '@/components/ui/Container';
import { Phone, Mail, MapPin } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="bg-white py-16 md:py-24">
      <Container>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800">Liên Hệ Với Chúng Tôi</h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Chúng tôi luôn sẵn lòng lắng nghe! Gửi thắc mắc của bạn cho chúng tôi,
            hoặc ghé thăm văn phòng của chúng tôi.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Cột trái: Form liên hệ */}
          <div className="bg-gray-50 p-8 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Gửi tin nhắn cho chúng tôi</h2>
            <form className="space-y-4">
              {/* Tên */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và Tên
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="email@example.com"
                />
              </div>

              {/* Tiêu đề */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Hỗ trợ về đơn hàng..."
                />
              </div>

              {/* Tin nhắn */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Nội dung tin nhắn
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Nội dung chi tiết..."
                />
              </div>

              {/* Nút Gửi */}
              <div>
                <button
                  type="submit"
                  className="w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-full shadow-md hover:bg-green-700 transition-colors"
                >
                  Gửi Tin Nhắn
                </button>
              </div>
            </form>
          </div>

          {/* Cột phải: Thông tin & Bản đồ */}
          <div className="space-y-8">
            {/* Thông tin liên hệ */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Thông tin liên hệ</h2>
              <div className="space-y-4 text-gray-600">
                <div className="flex items-center space-x-3">
                  <MapPin size={20} className="text-green-600" />
                  <span>123 Đường ABC, Quận 1, TP. Hồ Chí Minh</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone size={20} className="text-green-600" />
                  <span>(+84) 123 456 789</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail size={20} className="text-green-600" />
                  <span>hotro@agri-ecommerce.vn</span>
                </div>
              </div>
            </div>

            {/* Bản đồ (Placeholder) */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Vị trí của chúng tôi</h2>
              <div className="w-full h-80 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 shadow-sm border">
                (Bản đồ Google Map sẽ được nhúng ở đây)
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
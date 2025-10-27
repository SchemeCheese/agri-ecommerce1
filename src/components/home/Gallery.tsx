// src/components/home/Gallery.tsx
import React from 'react';
import { Container } from '@/components/ui/Container';
import Image from 'next/image';

// Dữ liệu ảnh mẫu
const galleryImages = [
  { src: '/images/nongsan/gallery-1.jpg', alt: 'Cánh đồng lúa' },
  { src: '/images/nongsan/gallery-2.jpg', alt: 'Thu hoạch dâu' },
  { src: '/images/nongsan/gallery-3.jpg', alt: 'Vườn rau thủy canh' },
  { src: '/images/nongsan/gallery-4.jpg', alt: 'Trái cây' },
  { src: '/images/nongsan/gallery-5.jpg', alt: 'Người nông dân' },
  { src: '/images/nongsan/gallery-6.jpg', alt: 'Nông sản đóng gói' },
];

export const Gallery = () => {
  return (
    <section id="gallery" className="py-16 bg-green-50/50">
      <Container>
        <h2 className="text-3xl font-bold text-center mb-10 text-gray-800">
          Hình ảnh từ nông trại
        </h2>
        <div className="columns-2 md:columns-3 gap-4">
          {galleryImages.map((img, index) => (
            <div key={index} className="mb-4 break-inside-avoid rounded-lg overflow-hidden shadow-md">
              <Image
                src={img.src}
                alt={img.alt}
                width={500}
                height={500}
                layout="responsive"
                objectFit="cover"
                className="w-full h-auto"
              />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};
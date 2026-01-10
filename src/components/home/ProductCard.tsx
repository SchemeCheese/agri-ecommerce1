"use client"; 

import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';

interface ProductCardProps {
  id: string;       
  imageUrl: string;
  title: string;
  description: string;
  price: string;    
  rawPrice: number;
  slug?: string;
  category?: string;
  sellerId?: string;
  stock?: number;
  unit?: string;
  createdAt?: Date;
}

export const ProductCard = ({ id, imageUrl, title, description, price, rawPrice, slug = '', category = '', sellerId = '', stock = 0, unit = '', createdAt = new Date() }: ProductCardProps) => {
  const addToCart = useCartStore((state) => state.addToCart);

  const handleAddToCart = () => {
    addToCart({
      id: id,
      name: title,
      price: rawPrice,
      images: [imageUrl],
      slug: slug,
      description: description,
      category: category,
      sellerId: sellerId,
      rating: 0,
      sold: 0,
      origin: ''
    });
    alert(`Đã thêm ${title} vào giỏ!`);
  };

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 bg-white">
      <div className="relative w-full h-48">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-800 mb-1 line-clamp-1">{title}</h3>
        <p className="text-sm text-gray-600 mb-3 h-10 line-clamp-2">{description}</p>
        <div className="flex justify-between items-center">
          <p className="font-bold text-green-600 text-lg">{price}</p>
          
          <button 
            onClick={handleAddToCart}
            className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-600 hover:text-white transition-colors"
            title="Thêm vào giỏ hàng"
          >
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
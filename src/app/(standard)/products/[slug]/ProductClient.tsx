"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useCartStore } from '@/store/useCartStore';
import { formatCurrency } from '@/utils/vi';
import { ShoppingCart, Plus, Minus, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle, 
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils"; 

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  slug: string;
  category: any;
  description: string;
}

export default function ProductClient({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const addToCart = useCartStore((state) => state.addToCart);

  const [activeIndex, setActiveIndex] = useState(0);
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api) return;
    api.scrollTo(activeIndex);
  }, [api, isModalOpen, activeIndex]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
  };

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      images: product.images,
      slug: product.slug,
      category: product.category,
      description: product.description,
      origin: 'khac',
      seasons: []
    }, quantity);
    alert("Đã thêm vào giỏ hàng!");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-xl shadow-sm">
      
      <div className="space-y-4">
        
        <div 
          className="relative aspect-square w-full rounded-lg overflow-hidden border group select-none"
          onDoubleClick={() => setIsModalOpen(true)}
        >
          <Image 
            src={product.images[activeIndex]} 
            alt={product.name} 
            fill 
            className="object-cover transition-transform duration-500"
            priority 
          />

          {product.images.length > 1 && (
            <>
              <button 
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <div className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <ZoomIn size={16} />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {product.images.map((img, idx) => (
            <div 
              key={idx} 
              onClick={() => setActiveIndex(idx)}
              className={cn(
                "relative w-20 h-20 flex-shrink-0 border-2 rounded-md cursor-pointer overflow-hidden transition-all",
                activeIndex === idx ? "border-green-600 opacity-100" : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <Image src={img} alt="thumbnail" fill className="object-cover" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
        <p className="text-sm text-gray-500 mb-4">Mã SP: {product.id} | Tình trạng: Còn hàng</p>
        
        <div className="text-3xl font-bold text-green-600 mb-6">
          {formatCurrency(product.price)}
        </div>

        <p className="text-gray-700 mb-8 leading-relaxed">
          {product.description}
        </p>

        <div className="flex items-center space-x-6 mb-8">
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3 hover:bg-gray-100">
              <Minus size={18}/>
            </button>
            <span className="px-4 font-bold w-12 text-center">{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)} className="p-3 hover:bg-gray-100">
              <Plus size={18}/>
            </button>
          </div>

          <button 
            onClick={handleAddToCart}
            className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-lg shadow-green-200"
          >
            <ShoppingCart size={20} />
            Thêm vào giỏ hàng
          </button>
        </div>

        <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
          <p>Cam kết 100% nguồn gốc rõ ràng</p>
          <p>Đổi trả trong 24h nếu hư hỏng</p>
          <p>Freeship đơn hàng từ 500k</p>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl w-full p-0 bg-transparent border-none shadow-none text-white flex flex-col items-center justify-center h-[90vh]">
          <DialogTitle className="hidden">Xem chi tiết ảnh</DialogTitle>
          
          <div className="relative w-full h-full flex items-center justify-center">
            <Carousel setApi={setApi} className="w-full max-w-3xl">
              <CarouselContent>
                {product.images.map((img, index) => (
                  <CarouselItem key={index} className="flex items-center justify-center h-[80vh]">
                    <div className="relative w-full h-full">
                      <Image 
                        src={img} 
                        alt={`Slide ${index}`} 
                        fill 
                        className="object-contain"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 bg-white/10 hover:bg-white/30 text-white border-none" />
              <CarouselNext className="right-2 bg-white/10 hover:bg-white/30 text-white border-none" />
            </Carousel>
          </div>

          <div className="flex gap-2 mt-4 overflow-x-auto max-w-full px-4">
             {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => api?.scrollTo(idx)}
                  className={cn(
                    "relative w-16 h-16 rounded overflow-hidden border-2 transition-all flex-shrink-0",
                    activeIndex === idx ? "border-green-500 opacity-100" : "border-transparent opacity-50"
                  )}
                >
                  <Image src={img} alt="thumb" fill className="object-cover" />
                </button>
             ))}
          </div>

        </DialogContent>
      </Dialog>
    </div>
  );
}
// src/components/home/BannerSlider.tsx
'use client'; 
import React, { useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Fade from 'embla-carousel-fade';

export const BannerSlider = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000 }), Fade()]);
  
  const images = [
     '/images/nongsan/banner-1.jpg', 
     '/images/nongsan/banner-2.jpg', 
     '/images/nongsan/banner-3.jpg' 
  ];

  return (
    <div className="overflow-hidden relative h-[600px] sm:h-[720px]" ref={emblaRef}>
      <div className="flex h-full">
        {images.map((src, index) => (
          <div className="relative flex-[0_0_100%] h-full" key={index}>
            <img
              src={src}
              alt={`Banner Nông Sản ${index + 1}`}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/30"></div>
          </div>
        ))}
      </div>
    </div>
  );
};
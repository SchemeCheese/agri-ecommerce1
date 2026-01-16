import React from 'react';
import { notFound } from 'next/navigation';
import { MOCK_PRODUCTS } from '@/data'
import ProductClient from './ProductClient'; 

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params; 
  
  const product = MOCK_PRODUCTS.find((p) => p.slug === resolvedParams.slug);

  if (!product) return notFound(); 

  return (
    <div className="container mx-auto px-4 py-8">
      <ProductClient product={product} />
    </div>
  );
}
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_PRODUCTS, Product } from '@/data';
import { PageHeader } from '@/components/seller/common/PageHeader';
import { ProductForm } from '@/components/seller/products/ProductForm';
import { ArrowLeft } from 'lucide-react';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    const fetch = async () => {
       const resolvedParams = await params;
       const found = MOCK_PRODUCTS.find(p => p.id === resolvedParams.id);
       if (found) setProduct(found);
    }
    fetch();
  }, [params]);

  const handleUpdate = (data: any) => {
    console.log("Update Data:", data);
    alert("Cập nhật thành công!");
    router.push('/dashboard/products');
  };

  if (!product) return <div>Đang tải...</div>;

  return (
    <div>
      <button 
         onClick={() => router.back()} 
         className="mb-4 text-gray-500 hover:text-green-600 flex items-center gap-1 text-sm font-medium"
      >
         <ArrowLeft size={16} /> Quay lại
      </button>

      <PageHeader 
        title="Chỉnh Sửa Sản Phẩm" 
        subtitle={`ID: ${product.id} - Cập nhật lần cuối: Hôm nay`}
      />

      <ProductForm initialData={product} onSubmit={handleUpdate} />
    </div>
  );
}
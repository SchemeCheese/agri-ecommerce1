"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/seller/common/PageHeader';
import { ProductForm } from '@/components/seller/products/ProductForm';
import { ArrowLeft } from 'lucide-react';

export default function CreateProductPage() {
  const router = useRouter();

  const handleCreate = (data: any) => {
    console.log("Create Data:", data);
    alert("Tạo sản phẩm thành công!");
    router.push('/dashboard/products');
  };

  return (
    <div>
      <button 
         onClick={() => router.back()} 
         className="mb-4 text-gray-500 hover:text-green-600 flex items-center gap-1 text-sm font-medium"
      >
         <ArrowLeft size={16} /> Quay lại danh sách
      </button>

      <PageHeader 
        title="Thêm Sản Phẩm Mới" 
        subtitle="Điền thông tin chi tiết để đăng bán sản phẩm"
      />

      <ProductForm onSubmit={handleCreate} />
    </div>
  );
}
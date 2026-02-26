import React from 'react';
import { notFound } from 'next/navigation';
import axios from 'axios';
import ProductClient from './ProductClient'; 

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params; 
  
  try {
    // 1. Gọi API lấy chi tiết 1 sản phẩm từ Backend
    const detailRes = await axios.get(`http://localhost:3001/products/${resolvedParams.slug}`);
    const product = detailRes.data;

    // 2. Gọi API lấy danh sách TẤT CẢ sản phẩm để làm phần "Gợi ý" và "Sản phẩm cùng Shop"
    const allRes = await axios.get(`http://localhost:3001/products`);
    const allProducts = allRes.data;

    if (!product) return notFound(); 

    return (
      <div className="container mx-auto px-4 py-8">
        <ProductClient product={product} allProducts={allProducts} />
      </div>
    );
  } catch (error) {
    console.error("Lỗi khi tải chi tiết sản phẩm:", error);
    return notFound(); // Nếu API lỗi hoặc không tìm thấy ID, hiển thị trang 404
  }
}
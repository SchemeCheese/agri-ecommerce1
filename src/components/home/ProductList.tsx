"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container } from '@/components/ui/Container'; 
import { ProductCard } from './ProductCard';

const ITEMS_PER_PAGE = 6;
const API_URL = 'http://localhost:3001/products'; // Địa chỉ API Backend

const CATEGORIES = [
  { id: 'all', label: 'Tất cả' },
  // Chú ý: Backend trả về 'Trái cây', 'Rau củ' (chữ thường hoặc hoa tuỳ bạn config, ở đây map theo tên trả về)
  { id: 'Trái cây', label: 'Trái cây' },
  { id: 'Rau củ', label: 'Rau củ' },
  { id: 'Ngũ cốc', label: 'Ngũ cốc & Hạt' },
  { id: 'Gia vị', label: 'Gia vị' },
  { id: 'Khác', label: 'Khác' },
];

export const ProductList = () => {
  const [products, setProducts] = useState<any[]>([]); // State lưu trữ dữ liệu thật
  const [loading, setLoading] = useState(true);
  
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Gọi API lấy dữ liệu khi component render
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(API_URL);
        setProducts(response.data);
      } catch (error) {
        console.error("Lỗi khi tải sản phẩm:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Lọc dữ liệu thật
  const filteredProducts = activeCategory === 'all' 
    ? products 
    : products.filter(product => product.category === activeCategory);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    setCurrentPage(1); 
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <section id="products" className="py-16 bg-white">
        <Container>
          <div className="text-center text-gray-500 py-10">Đang tải sản phẩm từ máy chủ...</div>
        </Container>
      </section>
    );
  }

  return (
    <section id="products" className="py-16 bg-white">
      <Container> 
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Danh sách sản phẩm
        </h2>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 border ${
                activeCategory === cat.id
                  ? 'bg-green-600 text-white border-green-600' 
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100' 
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[400px]">
          {currentProducts.length > 0 ? (
            currentProducts.map((product) => (
              <ProductCard
                key={product.id} 
                id={product.id} 
                imageUrl={product.images[0]} 
                title={product.name}
                description={product.description}
                price={`${product.price.toLocaleString('vi-VN')}đ / kg`}
                rawPrice={product.price} 
                slug={product.slug}
                category={product.category as any} // Ép kiểu tạm thời
              />
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500 py-10">
              Không tìm thấy sản phẩm nào trong danh mục này.
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-12">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-md border ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-green-50 hover:text-green-600 border-gray-300'
              }`}
            >
              &laquo; Trước
            </button>

            <span className="text-gray-600 font-medium">
              Trang {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-md border ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-green-50 hover:text-green-600 border-gray-300'
              }`}
            >
              Sau &raquo;
            </button>
          </div>
        )}
      </Container>
    </section>
  );
};
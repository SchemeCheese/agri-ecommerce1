// src/data/mockData.ts
export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number; 
  description: string;
  images: string[];
  category: string;
  sellerId: string;
  rating: number;
  sold: number;
  origin: string; 
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    slug: 'dau-tay-da-lat',
    name: 'Dâu tây Đà Lạt chuẩn VietGAP',
    price: 120000,
    originalPrice: 150000,
    description: 'Dâu tây tươi, mọng nước, được hái tại vườn...',
    images: ['/images/nongsan/product-1.jpg'],
    category: 'TraiCay',
    sellerId: 'farmer1',
    rating: 4.8,
    sold: 120,
    origin: 'Lâm Đồng'
  },
  {
    id: 'p2',
    slug: 'bo-sap-034',
    name: 'Bơ sáp 034 Lâm Đồng',
    price: 80000,
    description: 'Bơ sáp dẻo, béo ngậy, hạt nhỏ...',
    images: ['/images/nongsan/product-2.jpg'],
    category: 'TraiCay',
    sellerId: 'farmer1',
    rating: 4.5,
    sold: 85,
    origin: 'Lâm Đồng'
  },
   {
    id: 'p3',
    slug: 'rau-xa-lach',
    name: 'Rau xà lách thủy canh',
    price: 50000,
    description: 'Rau sạch trồng trong nhà kính...',
    images: ['/images/nongsan/product-3.jpg'],
    category: 'RauCu',
    sellerId: 'farmer2',
    rating: 5.0,
    sold: 200,
    origin: 'Đà Lạt'
  },
   {
    id: 'p4',
    slug: 'gao-st25',
    name: 'Gạo ST25 Ông Cua',
    price: 200000,
    description: 'Gạo ngon nhất thế giới...',
    images: ['/images/nongsan/product-4.jpg'],
    category: 'Gao',
    sellerId: 'farmer3',
    rating: 4.9,
    sold: 500,
    origin: 'Sóc Trăng'
  },
];

export const MOCK_SELLERS = [
  { id: 'farmer1', name: 'Nông trại Đà Lạt Phố', avatar: '/images/nongsan/farmer.jpg' },
  { id: 'farmer2', name: 'HTX Rau Sạch', avatar: '/images/nongsan/farmer.jpg' },
];
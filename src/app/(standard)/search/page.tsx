"use client";

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/home/ProductCard';
import { formatCurrency } from '@/utils/vi';
import { Loader2 } from 'lucide-react';
import api from '@/lib/axios';

const BACKEND_URL = 'http://localhost:3001';
const fixImg = (url: string) => {
  if (!url) return '/placeholder.png';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
};

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    api.get('/products', { params: { search: query } })
      .then(res => {
        const data: any[] = res.data;
        const filtered = data.filter(p =>
          p.name?.toLowerCase().includes(query.toLowerCase()) ||
          p.description?.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered);
      })
      .catch(err => console.error('Search error:', err))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        Kết quả tìm kiếm cho: &quot;<span className="text-green-600">{query}</span>&quot;
      </h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-green-600" size={32}/>
        </div>
      ) : results.length === 0 && query ? (
        <div className="text-center py-20 bg-white rounded-lg border">
          <p className="text-gray-500 text-lg">Không tìm thấy sản phẩm nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {results.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              slug={product.id}
              imageUrl={fixImg(product.images?.[0] ?? '')}
              title={product.name}
              description={product.description}
              price={formatCurrency(product.price)}
              rawPrice={product.price}
              unit={product.unit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-green-600" size={32}/></div>}>
      <SearchContent />
    </Suspense>
  );
}

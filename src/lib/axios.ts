// src/lib/axios.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001', // Thay đổi thành port của Backend NestJS
  timeout: 10000,
});

// Interceptor: Tự động đính kèm Token (nếu có) trước khi gửi request
api.interceptors.request.use(
  (config) => {
    // Chỉ chạy trên trình duyệt (client-side)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
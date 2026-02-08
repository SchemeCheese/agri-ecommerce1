"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';

// Định nghĩa User khớp với Backend
interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
const API_URL = 'http://localhost:3000';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // 1. Khôi phục phiên đăng nhập khi F5 trang
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedUser = localStorage.getItem('agri_user');
        const token = localStorage.getItem('access_token');
        
        if (storedUser && token) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);

          // Logic bảo vệ route: Nếu là Seller mà đang ở trang Buyer -> Đẩy về Dashboard
          if (parsedUser.role === 'SELLER' && !pathname.startsWith('/dashboard')) {
             // Tùy chọn: Có thể uncomment dòng dưới nếu muốn ép Seller luôn ở dashboard
             // router.replace('/dashboard'); 
          }
        }
      } catch (error) {
        console.error("Lỗi khôi phục phiên:", error);
        logout(); // Nếu dữ liệu lỗi thì đăng xuất luôn
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // 2. Hàm Login: Sửa lại Logic điều hướng
  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: email,
        password: pass,
      });

      const { access_token, user } = response.data;

      // Lưu vào LocalStorage
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('agri_user', JSON.stringify(user));
      setUser(user);

      // --- QUAN TRỌNG: Điều hướng dựa trên Role ---
      // Chuẩn hóa role về chữ in hoa để so sánh cho chắc chắn
      const userRole = user.role?.toUpperCase(); 

      if (userRole === 'SELLER') {
        router.push('/dashboard'); // Seller vào trang quản trị
      } else if (userRole === 'ADMIN') {
        router.push('/admin');     // Admin (nếu có)
      } else {
        router.push('/');          // Buyer ra trang chủ mua hàng
      }
      
      return true;
    } catch (error) {
      console.error("Login Error:", error);
      alert("Đăng nhập thất bại: Email hoặc mật khẩu không đúng.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Hàm Logout: Xóa sạch và chuyển trang
  const logout = () => {
    setUser(null);
    localStorage.removeItem('agri_user');
    localStorage.removeItem('access_token');
    
    // Dùng replace để không back lại được
    router.replace('/login'); 
    
    // Reload nhẹ để reset state của các component khác nếu cần
    setTimeout(() => {
        window.location.href = '/login';
    }, 100);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
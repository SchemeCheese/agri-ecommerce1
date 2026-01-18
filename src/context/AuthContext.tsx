// src/context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, MOCK_USERS } from '@/data/users';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 1. Check LocalStorage khi tải trang 
  useEffect(() => {
    const storedUser = localStorage.getItem('agri_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // 2. Hàm Login
  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    // Giả lập độ trễ mạng
    await new Promise(resolve => setTimeout(resolve, 500));

    const foundUser = MOCK_USERS.find(u => u.email === email && u.password === pass);
    
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('agri_user', JSON.stringify(foundUser));
      
      // LOGIC CHUYỂN HƯỚNG QUAN TRỌNG
      if (foundUser.role === 'seller') {
        router.push('/dashboard'); 
      } else {
        router.push('/'); 
      }
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  // 3. Hàm Logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem('agri_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
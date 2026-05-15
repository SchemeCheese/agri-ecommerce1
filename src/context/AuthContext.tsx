"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

import { useCartStore } from '@/store/useCartStore';
import api from '@/lib/axios';
import { firebaseAuth } from '@/lib/firebase';

interface User {
  id: string;
  email: string;
  full_name: string;
  is_buyer: boolean;
  is_seller: boolean;
  is_admin: boolean;
  avatar?: string;
}

type GoogleAuthRole = 'BUYER' | 'SELLER';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<User | null>;
  loginWithGoogle: (role: GoogleAuthRole) => Promise<{ message: string; user?: User }>;
  registerWithGoogle: (role: GoogleAuthRole) => Promise<{ message: string; user?: User }>;
  becomeSeller: () => Promise<User | null>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

async function getGoogleIdToken() {
  const auth = firebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('agri_user');
    const token = localStorage.getItem('access_token');
    if (storedUser && token) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      useCartStore.getState().setActiveUser(parsedUser.id);
    } else {
      useCartStore.getState().setActiveUser('guest');
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string): Promise<User | null> => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password: pass });
      const { access_token, user: loggedUser } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('agri_user', JSON.stringify(loggedUser));
      setUser(loggedUser);
      useCartStore.getState().setActiveUser(loggedUser.id);
      return loggedUser;
    } catch (error) {
      console.error('Login Error:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const authenticateGoogle = async (mode: 'login' | 'register', role: GoogleAuthRole) => {
    setIsLoading(true);
    try {
      const idToken = await getGoogleIdToken();
      const response = await api.post(`/auth/google/${mode}`, { idToken, role });

      if (mode === 'login') {
        const { access_token, user: loggedUser, message } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('agri_user', JSON.stringify(loggedUser));
        setUser(loggedUser);
        useCartStore.getState().setActiveUser(loggedUser.id);
        return { message: message || 'Đăng nhập thành công', user: loggedUser };
      }

      return { message: response.data.message || 'Đăng ký thành công', user: response.data.user };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = (role: GoogleAuthRole) => authenticateGoogle('login', role);
  const registerWithGoogle = (role: GoogleAuthRole) => authenticateGoogle('register', role);

  // Nâng cấp tài khoản hiện tại thành seller. BE trả về JWT mới (chứa is_seller=true)
  // → ghi đè token + user trong localStorage để các request sau dùng quyền seller ngay.
  const becomeSeller = async (): Promise<User | null> => {
    try {
      const response = await api.post('/auth/become-seller');
      const { access_token, user: updated } = response.data;
      if (access_token) localStorage.setItem('access_token', access_token);
      if (updated) {
        localStorage.setItem('agri_user', JSON.stringify(updated));
        setUser(updated);
        return updated;
      }
      return null;
    } catch (err) {
      console.error('becomeSeller error:', err);
      return null;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('agri_user');
    localStorage.removeItem('access_token');
    useCartStore.getState().setActiveUser('guest');
    setTimeout(() => { window.location.href = '/login'; }, 100);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, registerWithGoogle, becomeSeller, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

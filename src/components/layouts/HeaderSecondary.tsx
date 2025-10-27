// src/components/layouts/HeaderSecondary.tsx
'use client'; 
import React, { useState } from 'react';
import { User, ShoppingCart, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { Container } from '@/components/ui/Container';
import Link from 'next/link'

// Đường dẫn logo (chỉ dùng logo tối)
const LOGO_DARK = '/logos/agri-logo-dark.png'; 

export const HeaderSecondary = () => {
  const { t, currentLanguage, changeLanguage } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', text: t('home') }, // Cập nhật link về trang chủ
    { href: '/products', text: t('products') }, // Cập nhật link
    { href: '/about', text: t('about') },
    { href: '/contact', text: t('contact') },
  ];

  return (
    <header className="sticky top-0 left-0 right-0 z-30 bg-white shadow-md h-16 flex items-center">
      <Container className="flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <img src={LOGO_DARK} alt="Agri Logo" className="h-10 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <a 
              key={link.text} 
              href={link.href} 
              className="text-sm font-semibold text-gray-700 hover:text-green-600"
            >
              {link.text}
            </a>
          ))}
          {/* Language & User */}
          <button 
            onClick={() => changeLanguage(currentLanguage === 'vi' ? 'en' : 'vi')} 
            className="text-sm font-semibold text-gray-700 hover:text-green-600"
          >
            {currentLanguage === 'vi' ? 'EN' : 'VI'}
          </button>
          <a href="/cart" className="flex items-center space-x-1 text-gray-700 hover:text-green-600">
            <ShoppingCart size={20} />
            <span className="text-xs">(0)</span>
          </a>
          <button className="flex items-center space-x-1 text-gray-700 hover:text-green-600">
            <User size={20} />
            <span className="hidden lg:inline text-sm">{t('login_register')}</span>
          </button>
        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center space-x-2">
            <a href="/cart" className="flex items-center space-x-1 text-gray-700 hover:text-green-600">
                <ShoppingCart size={20} />
            </a>
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-gray-700 hover:bg-gray-100"
                aria-label="Toggle menu"
            >
                <Menu size={24} />
            </button>
        </div>
      </Container>
       {/* Mobile Menu */}
       <div className={cn(
            "md:hidden absolute top-16 left-0 right-0 bg-white shadow-lg transition-transform duration-300 ease-in-out",
            isMobileMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
        )}>
            <nav className="flex flex-col p-4 space-y-2">
                {navLinks.map((link) => (
                    <a key={link.text} href={link.href} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-green-600">
                    {link.text}
                    </a>
                ))}
                 <button onClick={() => changeLanguage(currentLanguage === 'vi' ? 'en' : 'vi')} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-green-600 text-left">
                    {currentLanguage === 'vi' ? 'Switch to EN' : 'Chuyển sang VI'}
                 </button>
                 <button className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-green-600 text-left">
                    <User size={20} className="mr-2"/> {t('login_register')}
                 </button>
            </nav>
        </div>
    </header>
  );
};
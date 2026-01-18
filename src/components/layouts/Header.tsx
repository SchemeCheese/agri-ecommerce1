'use client';

import { useState, useEffect } from 'react'; // Gom import lại
import { User, ShoppingCart, Menu, LogOut, ChevronDown } from 'lucide-react'; 
import Link from 'next/link'; 
import Image from 'next/image'; // Nên dùng Image của Next.js thay vì img thẻ thường
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { Container } from '@/components/ui/Container';
import { useCartStore } from '@/store/useCartStore';
import { useAuth } from '@/context/AuthContext'; // ✅ Dùng Context mới

interface HeaderProps {
  isScrolled: boolean;
  logoSrc: string;
}

export const Header = ({ isScrolled, logoSrc }: HeaderProps) => {
  // 1. Sử dụng AuthContext thay vì Store cũ
  const { user, logout } = useAuth(); 
  
  // 2. State Hydration
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { t, currentLanguage, changeLanguage } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { items } = useCartStore();
  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

  const navLinks = [
    { href: '/', text: t('home') },
    { href: '/products', text: t('products') },
    { href: '/about', text: t('about') },
    { href: '/contact', text: t('contact') },
  ];

  // Helper để đóng menu mobile khi click
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-30 transition-all duration-300 ease-in-out h-16 flex items-center",
      isScrolled ? "bg-white shadow-md" : "bg-transparent"
    )}>
      <Container className="flex justify-between items-center">
        {/* LOGO */}
        <Link href="/" className="flex-shrink-0">
          {/* Dùng thẻ img cho logoSrc string, hoặc Image nếu là static import */}
          <img src={logoSrc} alt="Agri Logo" className="h-10 w-auto transition-all duration-300 ease-in-out" />
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link key={link.text} href={link.href} className={cn(
              "text-sm font-semibold transition-colors duration-200 ease-in-out",
              isScrolled ? "text-gray-700 hover:text-green-600" : "text-white hover:text-green-300"
            )}>
              {link.text}
            </Link>
          ))}
          
          {/* Language Switcher */}
          <button 
            onClick={() => changeLanguage(currentLanguage === 'vi' ? 'en' : 'vi')} 
            className={cn("text-sm font-semibold uppercase", isScrolled ? "text-gray-700 hover:text-green-600" : "text-white hover:text-green-300")}
          >
            {currentLanguage}
          </button>
          
          {/* Cart */}
          <Link href="/cart" className={cn("flex items-center space-x-1 relative", isScrolled ? "text-gray-700 hover:text-green-600" : "text-white hover:text-green-300")}>
            <ShoppingCart size={20} />
            {mounted && cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </span>
            )}
          </Link>
          
          {/* User Profile / Login */}
          {mounted && user ? (
            <div className="relative group">
                <Link href={user.role === 'seller' ? '/dashboard' : '/profile'} className={cn("flex items-center space-x-2 pl-2 border-l border-gray-300 cursor-pointer", isScrolled ? "text-gray-700 hover:text-green-600" : "text-white hover:text-green-300")}>
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm overflow-hidden relative">
                    {user.avatar ? (
                        <Image src={user.avatar} alt={user.name} fill className="object-cover"/>
                    ) : (
                        user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="hidden lg:inline text-sm font-medium max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown size={14} />
                </Link>

                {/* Dropdown Menu Desktop */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 hidden group-hover:block p-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <Link href={user.role === 'seller' ? '/dashboard' : '/profile'} className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg">
                        Hồ sơ của tôi
                    </Link>
                    {user.role === 'seller' && (
                         <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg">
                            Quản lý Shop
                        </Link>
                    )}
                    <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2">
                        <LogOut size={14} /> Đăng xuất
                    </button>
                </div>
            </div>
          ) : (
            <Link href="/login" className={cn("flex items-center space-x-1", isScrolled ? "text-gray-700 hover:text-green-600" : "text-white hover:text-green-300")}>
              <User size={20} />
              <span className="hidden lg:inline text-sm">{t('login_register')}</span>
            </Link>
          )}
        </nav>

        {/* MOBILE TOGGLE */}
        <div className="md:hidden flex items-center space-x-4">
          <Link href="/cart" className={cn("flex items-center relative", isScrolled ? "text-gray-700 hover:text-green-600" : "text-white hover:text-green-300")}>
            <ShoppingCart size={20} />
            {mounted && cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={cn("p-2 rounded-md", isScrolled ? "text-gray-700 hover:bg-gray-100" : "text-white hover:bg-black/20")}
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </Container>
      
      {/* MOBILE MENU */}
      <div className={cn(
        "md:hidden absolute top-16 left-0 right-0 bg-white shadow-lg transition-all duration-300 ease-in-out overflow-hidden",
        isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
      )}>
        <nav className="flex flex-col p-4 space-y-2 border-t border-gray-100">
          {navLinks.map((link) => (
            <Link 
                key={link.text} 
                href={link.href} 
                onClick={closeMobileMenu} // Đóng menu khi click
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-green-600"
            >
              {link.text}
            </Link>
          ))}
          
          <button onClick={() => { changeLanguage(currentLanguage === 'vi' ? 'en' : 'vi'); closeMobileMenu(); }} className="block w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-green-600 text-left">
            {currentLanguage === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          </button>
          
          {mounted && user ? (
            <div className="mt-4 pt-4 border-t border-gray-100">
                <Link href={user.role === 'seller' ? '/dashboard' : '/profile'} onClick={closeMobileMenu} className="flex items-center px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-green-600 bg-green-50">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm mr-3 relative overflow-hidden">
                    {user.avatar ? <Image src={user.avatar} alt={user.name} fill className="object-cover"/> : user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                    <span>{user.name}</span>
                    <span className="text-xs text-gray-500">
                        {user.role === 'seller' ? 'Quản lý Shop' : 'Xem hồ sơ'}
                    </span>
                </div>
                </Link>
                <button onClick={() => { logout(); closeMobileMenu(); }} className="mt-2 w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-md font-medium text-sm flex items-center gap-2">
                    <LogOut size={16}/> Đăng xuất
                </button>
            </div>
          ) : (
            <Link href="/login" onClick={closeMobileMenu} className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-green-600 text-left mt-2">
              <User size={20} className="mr-2" /> {t('login_register')}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};
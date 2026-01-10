'use client';
import { useState } from 'react';
import { User, ShoppingCart, Menu } from 'lucide-react'; 
import Link from 'next/link'; 
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { Container } from '@/components/ui/Container';
import { useCartStore } from '@/store/useCartStore';

interface HeaderProps {
  isScrolled: boolean;
  logoSrc: string;
}

export const Header = ({ isScrolled, logoSrc }: HeaderProps) => {
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

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-30 transition-all duration-300 ease-in-out h-16 flex items-center",
      isScrolled ? "bg-white shadow-md" : "bg-transparent"
    )}>
      <Container className="flex justify-between items-center">
        <Link href="/" className="flex-shrink-0">
          <img src={logoSrc} alt="Agri Logo" className="h-10 w-auto transition-all duration-300 ease-in-out" />
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link key={link.text} href={link.href} className={cn(
              "text-sm font-semibold transition-colors duration-200 ease-in-out",
              isScrolled ? "text-gray-700 hover:text-green-600" : "text-white hover:text-green-300"
            )}>
              {link.text}
            </Link>
          ))}
          
          <button onClick={() => changeLanguage(currentLanguage === 'vi' ? 'en' : 'vi')} className={cn("text-sm font-semibold", isScrolled ? "text-gray-700 hover:text-green-600" : "text-white hover:text-green-300")}>
            {currentLanguage === 'vi' ? 'EN' : 'VI'}
          </button>
          
          <Link href="/cart" className={cn("flex items-center space-x-1 relative", isScrolled ? "text-gray-700 hover:text-green-600" : "text-white hover:text-green-300")}>
            <ShoppingCart size={20} />
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </span>
            )}
          </Link>
          
          <Link href="/login" className={cn("flex items-center space-x-1", isScrolled ? "text-gray-700 hover:text-green-600" : "text-white hover:text-green-300")}>
            <User size={20} />
            <span className="hidden lg:inline text-sm">{t('login_register')}</span>
          </Link>
        </nav>

        <div className="md:hidden flex items-center space-x-2">
          <Link href="/cart" className={cn("flex items-center relative", isScrolled ? "text-gray-700 hover:text-green-600" : "text-white hover:text-green-300")}>
            <ShoppingCart size={20} />
            {cartItemCount > 0 && (
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
      
      <div className={cn(
        "md:hidden absolute top-16 left-0 right-0 bg-white shadow-lg transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
      )}>
        <nav className="flex flex-col p-4 space-y-2">
          {navLinks.map((link) => (
            <Link key={link.text} href={link.href} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-green-600">
              {link.text}
            </Link>
          ))}
          <button onClick={() => changeLanguage(currentLanguage === 'vi' ? 'en' : 'vi')} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-green-600 text-left">
            {currentLanguage === 'vi' ? 'Switch to EN' : 'Chuyển sang VI'}
          </button>
          <Link href="/login" className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-green-600 text-left">
            <User size={20} className="mr-2" /> {t('login_register')}
          </Link>
        </nav>
      </div>
    </header>
  );
};
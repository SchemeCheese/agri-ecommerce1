"use client"; // Cần use client vì Header có logic

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layouts/Header";
import { HeaderSecondary } from "@/components/layouts/HeaderSecondary";
import { Footer } from "@/components/layouts/Footer";

export default function StandardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isScrolled, setIsScrolled] = useState(false);

  // Hiệu ứng scroll cho Header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Logic hiển thị 2 loại Header tùy ý bạn */}
      <Header isScrolled={isScrolled} logoSrc="/logos/agri-logo.png" />
      
      {/* Nội dung chính của các trang người mua */}
      <main className="flex-grow">
        {children}
      </main>

      <Footer />
    </div>
  );
}
// src/components/ui/Container.tsx
import React from 'react';
import { cn } from '@/lib/utils'; // Đảm bảo bạn đã có file này

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const Container = ({ children, className = '' }: ContainerProps) => (
  <div className={cn(
    "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", 
    className
  )}>
    {children}
  </div>
);
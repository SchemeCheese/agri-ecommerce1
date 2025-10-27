// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css"; // Import CSS toàn cục

export const metadata: Metadata = {
  title: "Web Bán Nông Sản",
  description: "Dự án web bán nông sản",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
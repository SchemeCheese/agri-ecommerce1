'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <ShieldAlert className="h-16 w-16 text-red-500" />
      <h1 className="mt-4 text-3xl font-extrabold text-slate-900">403 — Không có quyền truy cập</h1>
      <p className="mt-2 max-w-md text-slate-500">
        Khu vực Quản trị chỉ dành cho tài khoản Admin. Nếu bạn cho rằng đây là nhầm lẫn, vui lòng đăng nhập bằng tài
        khoản quản trị.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="rounded-xl bg-[#16A34A] px-5 py-2.5 font-bold text-white hover:bg-green-700">
          Về trang chủ
        </Link>
        <Link href="/login" className="rounded-xl border border-slate-300 px-5 py-2.5 font-bold text-slate-700 hover:bg-slate-100">
          Đăng nhập
        </Link>
      </div>
    </div>
  );
}

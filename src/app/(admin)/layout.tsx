'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Users, Store, PackageSearch, Gavel, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const NAV = [
  { href: '/admin/dashboard', label: 'Tổng quan', icon: BarChart3 },
  { href: '/admin/users', label: 'Người dùng', icon: Users },
  { href: '/admin/shops', label: 'Duyệt shop', icon: Store },
  { href: '/admin/products', label: 'Kiểm duyệt SP', icon: PackageSearch },
  { href: '/admin/disputes', label: 'Tranh chấp', icon: Gavel },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Chốt chặn client-side: phiên dựa trên localStorage nên không thể dùng server redirect.
  useEffect(() => {
    if (!isLoading && (!user || !user.is_admin)) {
      router.replace('/forbidden');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || !user.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#16A34A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100">
          <p className="text-lg font-extrabold text-slate-900">Agri-Connect</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#16A34A]">Admin Portal</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active ? 'bg-green-50 text-[#16A34A]' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <button
            onClick={() => {
              logout();
              router.replace('/login');
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6">
          <h1 className="text-base font-bold text-slate-800">Bảng điều khiển quản trị</h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">{user.full_name}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
            <button
              onClick={() => {
                logout();
                router.replace('/login');
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

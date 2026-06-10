// src/app/(auth)/login/page.tsx
"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Mail, Lock, ArrowRight, User, Store } from 'lucide-react';

function LoginContent() {
  const router = useRouter();

  const { login, loginWithGoogle, selectRole } = useAuth();
  const { show: showToast, ToastNode } = useToast();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [selectedRole, setSelectedRole] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [loading, setLoading] = useState(false);
  // Tài khoản dual-role (BUYER + SELLER): BE trả tempToken, FE hiện màn CHỌN workspace.
  // Giữ tempToken + danh sách vai trò sở hữu để gọi selectRole đúng activeRole.
  const [roleChoice, setRoleChoice] = useState<{ tempToken: string; allowedRoles: string[] } | null>(null);

  // Điều hướng theo activeRole đã được BE cấp:
  //  - ADMIN  → /admin/dashboard (vào thẳng trang quản trị)
  //  - SELLER → /dashboard (kênh người bán)
  //  - BUYER  → / (trang mua hàng)
  const landingPathFor = (role?: string) =>
    role === 'ADMIN' ? '/admin/dashboard' : role === 'SELLER' ? '/dashboard' : '/';

  const finishWithUser = (u: { activeRole?: string }) => {
    showToast('Đăng nhập thành công! Đang chuyển hướng...', 'success');
    setTimeout(() => router.push(landingPathFor(u.activeRole)), 1000);
  };

  // Tài khoản sở hữu CẢ buyer + seller → KHÔNG tự chọn vai trò. Hiện màn chọn
  // workspace; khi user chọn, gọi BE selectRole để phát token với đúng activeRole.
  const resolveOutcome = async (outcome: Awaited<ReturnType<typeof login>>) => {
    if (outcome.requiresRoleSelection) {
      setRoleChoice({ tempToken: outcome.tempToken, allowedRoles: outcome.allowedRoles });
      setLoading(false);
      return;
    }
    finishWithUser(outcome.user);
  };

  // User chọn workspace ở màn role-selection → BE phát token mới với activeRole tương ứng.
  const handlePickRole = async (role: 'BUYER' | 'SELLER') => {
    if (!roleChoice) return;
    setLoading(true);
    try {
      const u = await selectRole(roleChoice.tempToken, role);
      if (u) {
        setRoleChoice(null);
        finishWithUser(u);
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể chọn vai trò. Vui lòng đăng nhập lại.', 'error');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resolveOutcome(await login(formData.email, formData.password));
    } catch (error: any) {
      const status = error?.response?.status;
      const msg = status === 403
        ? 'Tài khoản chưa xác thực OTP. Vui lòng kiểm tra email để kích hoạt.'
        : (error?.response?.data?.message || 'Email hoặc mật khẩu không chính xác!');
      showToast(Array.isArray(msg) ? msg[0] : msg, 'error');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await resolveOutcome(await loginWithGoogle(selectedRole));
    } catch (error: any) {
      // User-initiated popup dismissal — not a real error.
      const code = error?.code ?? error?.cause?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setLoading(false);
        return;
      }
      console.error('[LOGIN] handleGoogleLogin caught', error?.response?.status, error?.response?.data ?? error?.message);
      showToast(error.response?.data?.message || error.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.', 'error');
      setLoading(false);
    }
  };

  const selectGoogleRole = (role: 'buyer' | 'seller') => {
    setSelectedRole(role === 'buyer' ? 'BUYER' : 'SELLER');
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {ToastNode}

      {/* MÀN CHỌN WORKSPACE cho tài khoản dual-role (BUYER + SELLER) */}
      {roleChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-5">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900">Chọn không gian làm việc</h3>
              <p className="mt-1 text-sm text-gray-500">Tài khoản của bạn có cả vai trò Người mua và Người bán.</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => handlePickRole('BUYER')}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-green-600 hover:bg-green-50 transition disabled:opacity-60"
              >
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-700"><User size={20} /></span>
                <span className="text-left">
                  <span className="block font-bold text-gray-900">Người mua</span>
                  <span className="block text-xs text-gray-500">Mua hàng, thanh toán, đánh giá</span>
                </span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handlePickRole('SELLER')}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-green-600 hover:bg-green-50 transition disabled:opacity-60"
              >
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-700"><Store size={20} /></span>
                <span className="text-left">
                  <span className="block font-bold text-gray-900">Người bán</span>
                  <span className="block text-xs text-gray-500">Quản lý sản phẩm, đơn hàng, doanh thu</span>
                </span>
              </button>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => { setRoleChoice(null); setLoading(false); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Huỷ
            </button>
          </div>
        </div>
      )}

      {/* --- CỘT TRÁI: ẢNH --- */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-green-900">
        <Image
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=2574&auto=format&fit=crop"
          alt="Agriculture"
          fill
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-12 text-white">
          <h2 className="text-4xl font-bold mb-4">Thực phẩm sạch <br/> Cho cuộc sống xanh</h2>
          <p className="text-lg opacity-90">Kết nối nông sản Việt trực tiếp từ nông trại đến bàn ăn của gia đình bạn.</p>
        </div>
      </div>

      {/* --- CỘT PHẢI: FORM --- */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12 md:p-16 bg-gray-50 lg:bg-white">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight font-sans">
              Chào mừng trở lại!
            </h2>
            <p className="mt-2 text-sm text-gray-600 font-sans">
              Vui lòng đăng nhập để quản lý đơn hàng và thanh toán.
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={20} />
                </div>
                <input
                  required
                  type="email"
                  placeholder="Email của bạn"
                  className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={20} />
                </div>
                <input
                  required
                  type="password"
                  placeholder="Mật khẩu"
                  className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="remember-me" type="checkbox" className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer" />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">Ghi nhớ</label>
              </div>
              <a href="#" className="text-sm font-medium text-green-600 hover:text-green-500 hover:underline">
                Quên mật khẩu?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all shadow-lg shadow-green-200 disabled:opacity-70"
            >
              {loading ? 'Đang xác thực...' : 'ĐĂNG NHẬP NGAY'}
              {!loading && <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Chưa có tài khoản?{' '}
              <Link href="/register" className="font-semibold text-green-600 hover:text-green-500 transition-colors">
                Đăng ký miễn phí
              </Link>
            </p>
          </div>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-50 lg:bg-white text-gray-500">Hoặc tiếp tục với</span></div>
            </div>

            {/* Role selector cho Google login — single-select */}
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2 text-center">Bạn muốn đăng nhập với vai trò:</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button"
                  onClick={() => selectGoogleRole('buyer')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${selectedRole === 'BUYER' ? 'border-green-600 bg-green-50 text-green-700 ring-1 ring-green-600' : 'border-gray-200 text-gray-500 hover:border-green-300'}`}>
                  <User size={16} /> Người mua
                </button>
                <button type="button"
                  onClick={() => selectGoogleRole('seller')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${selectedRole === 'SELLER' ? 'border-green-600 bg-green-50 text-green-700 ring-1 ring-green-600' : 'border-gray-200 text-gray-500 hover:border-green-300'}`}>
                  <Store size={16} /> Người bán
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <button type="button" onClick={handleGoogleLogin} disabled={loading} className="flex justify-center items-center py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition bg-white disabled:opacity-70">
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="font-medium text-sm text-gray-700">Google</span>
              </button>

              <button type="button" className="flex justify-center items-center py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition bg-white">
                <svg className="h-5 w-5 mr-2 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="font-medium text-sm text-gray-700">Facebook</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <LoginContent />
    </Suspense>
  );
}

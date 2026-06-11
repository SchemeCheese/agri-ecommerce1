"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios'; 
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, User, ArrowRight, CheckCircle, Store, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function RegisterPage() {
  const router = useRouter();
  const { registerWithGoogle } = useAuth();
  const { show: showToast, ToastNode } = useToast();

  // --- STATES ---
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Điền Form | Step 2: Nhập OTP
  const [userId, setUserId] = useState(''); // Lưu ID để xác thực
  const [otp, setOtp] = useState(''); // Mã OTP 6 số
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    is_buyer: true,
    is_seller: false
  });
  
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const selectRole = (role: 'buyer' | 'seller') => {
    setFormData(prev => ({ ...prev, is_buyer: role === 'buyer', is_seller: role === 'seller' }));
  };

  // Password strength check khớp với BE regex
  const passwordChecks = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    digit: /\d/.test(formData.password),
  };
  const passwordStrong = Object.values(passwordChecks).every(Boolean);

  // --- HÀM SUBMIT BƯỚC 1: TẠO TÀI KHOẢN & NHẬN OTP ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp!', 'error');
      setLoading(false);
      return;
    }
    if (!passwordStrong) {
      showToast(
        'Mật khẩu chưa đủ mạnh',
        'error',
        [
          { label: 'Tối thiểu 8 ký tự', ok: passwordChecks.length },
          { label: 'Có chữ HOA (A–Z)', ok: passwordChecks.upper },
          { label: 'Có chữ thường (a–z)', ok: passwordChecks.lower },
          { label: 'Có chữ số (0–9)', ok: passwordChecks.digit },
        ],
      );
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName,
        is_buyer: formData.is_buyer,
        is_seller: formData.is_seller,
      });

      // BE có 3 luồng:
      // 1. OTP enabled + gửi OK → emailSent=true → step 2 (nhập OTP)
      // 2. OTP disabled → autoVerified=true → bỏ qua step 2, redirect login
      // 3. OTP enabled nhưng gửi fail + BYPASS_OTP_ON_ERROR → autoVerified=true
      if (response.data.autoVerified) {
        showToast(response.data.message || 'Tài khoản đã kích hoạt. Vui lòng đăng nhập.', 'success');
        setTimeout(() => router.push('/login'), 1200);
        return;
      }

      setUserId(response.data.userId);
      showToast('Mã OTP đã được gửi đến Email của bạn!', 'success');
      setStep(2);

    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message;
      if (status === 409 || status === 400) {
        showToast(msg || 'Thông tin đăng ký không hợp lệ.', 'error');
      } else if (status === 503) {
        showToast('Hệ thống email tạm thời lỗi. Vui lòng thử lại sau ít phút hoặc liên hệ admin.', 'error');
      } else {
        showToast(msg || 'Đăng ký thất bại. Vui lòng thử lại.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- HÀM SUBMIT BƯỚC 2: XÁC THỰC MÃ OTP ---
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (otp.length !== 6) {
      showToast('Vui lòng nhập đầy đủ 6 số OTP.', 'error');
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/verify-email', { userId, code: otp });
      showToast('Xác thực thành công! Đang chuyển hướng...', 'success');
      setTimeout(() => router.push('/login'), 1500);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    try {
      const role = formData.is_buyer ? 'BUYER' : 'SELLER';
      const result = await registerWithGoogle(role);
      showToast(result.message || 'Đăng ký Google thành công!', 'success');
      setTimeout(() => router.push('/login'), 1200);
    } catch (error: any) {
      showToast(error.response?.data?.message || error.message || 'Đăng ký Google thất bại. Vui lòng thử lại.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {ToastNode}
      
      {/* CỘT TRÁI: ẢNH */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-green-900">
        <Image 
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=2574&auto=format&fit=crop" 
          alt="Agriculture"
          fill sizes="(max-width: 1024px) 0px, 50vw" className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-12 text-white">
          <h2 className="text-4xl font-bold mb-4">Gia nhập cộng đồng <br/> Nông sản sạch</h2>
          <p className="text-lg opacity-90">Tạo tài khoản để nhận ưu đãi và theo dõi đơn hàng dễ dàng hơn.</p>
        </div>
      </div>

      {/* CỘT PHẢI: FORM */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12 md:p-16 bg-gray-50 lg:bg-white">
        <div className="max-w-md w-full space-y-8">
          
          {/* Header thay đổi theo Step */}
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight font-sans flex items-center gap-2 lg:justify-start justify-center">
              {step === 1 ? 'Tạo tài khoản mới' : <><ShieldCheck className="text-green-600" size={32}/> Xác thực Email</>}
            </h2>
            <p className="mt-2 text-sm text-gray-600 font-sans">
              {step === 1 ? 'Chọn vai trò và nhập thông tin để bắt đầu.' : `Chúng tôi đã gửi mã 6 số tới ${formData.email}`}
            </p>
          </div>

          {/* ================= GIAO DIỆN BƯỚC 1: ĐIỀN FORM ================= */}
          {step === 1 && (
            <form className="mt-8 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500" onSubmit={handleRegister}>
              {/* Chọn Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bạn là ai?</label>
                <div className="grid grid-cols-2 gap-4">
                  <div onClick={() => selectRole('buyer')} className={`cursor-pointer border rounded-lg p-4 flex flex-col items-center justify-center transition-all ${formData.is_buyer ? 'border-green-600 bg-green-50 ring-1 ring-green-600' : 'border-gray-200 hover:border-green-300'}`}>
                    <User className={`h-6 w-6 mb-2 ${formData.is_buyer ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-bold ${formData.is_buyer ? 'text-green-700' : 'text-gray-500'}`}>Người mua</span>
                  </div>
                  <div onClick={() => selectRole('seller')} className={`cursor-pointer border rounded-lg p-4 flex flex-col items-center justify-center transition-all ${formData.is_seller ? 'border-green-600 bg-green-50 ring-1 ring-green-600' : 'border-gray-200 hover:border-green-300'}`}>
                    <Store className={`h-6 w-6 mb-2 ${formData.is_seller ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-bold ${formData.is_seller ? 'text-green-700' : 'text-gray-500'}`}>Người bán</span>
                  </div>
                </div>
              </div>

              {/* Các Input Fields */}
              <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><User size={20} /></div>
                <input name="fullName" type="text" required placeholder="Họ và tên" className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition" onChange={handleChange} />
              </div>
              <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Mail size={20} /></div>
                <input name="email" type="email" required placeholder="Địa chỉ Email" className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition" onChange={handleChange} />
              </div>
              <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Lock size={20} /></div>
                <input name="password" type="password" required minLength={8} placeholder="Mật khẩu (≥8 ký tự, có chữ hoa, thường, số)" value={formData.password} className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition" onChange={handleChange} />
              </div>
              <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><CheckCircle size={20} /></div>
                <input name="confirmPassword" type="password" required placeholder="Nhập lại mật khẩu" className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition" onChange={handleChange} />
              </div>

              <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-500 transition-all shadow-lg shadow-green-200 disabled:opacity-70">
                {loading ? 'Đang xử lý...' : 'ĐĂNG KÝ TÀI KHOẢN'}
                {!loading && <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />}
              </button>

              <button type="button" onClick={handleGoogleRegister} disabled={loading} className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition disabled:opacity-70">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="font-medium text-sm text-gray-700">Đăng ký với Google</span>
              </button>
            </form>
          )}

          {/* ================= GIAO DIỆN BƯỚC 2: NHẬP OTP ================= */}
          {step === 2 && (
            <form className="mt-8 space-y-6 animate-in zoom-in-95 duration-300" onSubmit={handleVerifyOTP}>
              <div className="flex justify-center">
                <input 
                  type="text" 
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} // Chỉ cho phép nhập số
                  placeholder="------"
                  className="w-full max-w-[250px] text-center text-4xl tracking-[0.5em] font-bold text-green-700 border-b-2 border-gray-300 focus:border-green-600 outline-none bg-transparent py-4 transition-colors placeholder:text-gray-200"
                  autoFocus
                />
              </div>
              <p className="text-center text-sm text-gray-500">Mã có hiệu lực trong 5 phút.</p>

              <button type="submit" disabled={loading || otp.length < 6} className="w-full py-3 px-4 text-sm font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Đang kiểm tra...' : 'XÁC NHẬN MÃ OTP'}
              </button>
            </form>
          )}

          <div className="text-center mt-6">
             <p className="text-sm text-gray-600">
               Đã có tài khoản?{' '}
               <Link href="/login" className="font-semibold text-green-600 hover:text-green-500 transition-colors">
                 Đăng nhập ngay
               </Link>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
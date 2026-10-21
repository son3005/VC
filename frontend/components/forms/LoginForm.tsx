'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/lib/validation';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ApiRequestError } from '@/lib/api';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  Wallet,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { address, isConnecting, connect, disconnect } = useWallet();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleConnect = async () => {
    setServerError(null);
    try {
      await connect();
    } catch {
      setServerError('Không thể kết nối ví MetaMask. Vui lòng thử lại.');
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);

    if (!address) {
      setServerError('Vui lòng kết nối ví MetaMask trước khi đăng nhập.');
      return;
    }

    try {
      const user = await login(data.email, data.password, address);
      toast.success(`Đăng nhập thành công! Chào mừng ${user.displayName || 'bạn'}`);

      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/issuer');
      }
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        if (err.status === 401) {
          setServerError('Tài khoản, mật khẩu hoặc ví không đúng.');
        } else if (err.status === 400) {
          setServerError('Thông tin đăng nhập không hợp lệ.');
        } else {
          setServerError(err.message || 'Có lỗi xảy ra khi đăng nhập.');
        }
      } else {
        setServerError('Không thể kết nối đến máy chủ xác thực.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="p-3.5 rounded-xl bg-[#E6606A]/10 border border-[#E6606A]/30 text-xs text-[#B23F4A] flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Xác thực ví */}
      <div className="p-3.5 rounded-xl border border-[#E3D5B8] bg-[#FAF4DF]/60 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFFDF7] border border-[#E3D5B8] flex items-center justify-center shrink-0">
              {address ? (
                <ShieldCheck className="w-4 h-4 text-[#E6AB42]" />
              ) : (
                <Wallet className="w-4 h-4 text-[#6F5C4A]" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-[#010E1C]">
                {address ? 'Ví MetaMask đã kết nối' : 'Xác thực ví MetaMask'}
              </p>
              <p className="text-[11px] text-[#6F5C4A] leading-relaxed">
                {address
                  ? 'Ví này sẽ được kiểm tra khớp với tài khoản khi đăng nhập.'
                  : 'Bắt buộc kết nối đúng ví đã đăng ký với tài khoản.'}
              </p>
            </div>
          </div>

          {address ? (
            <button
              type="button"
              onClick={() => disconnect()}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B23F4A] hover:underline shrink-0"
            >
              <LogOut className="w-3 h-3" />
              Đổi ví
            </button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              isLoading={isConnecting}
              onClick={handleConnect}
              className="shrink-0"
            >
              Kết nối
            </Button>
          )}
        </div>

        {!address && (
          <p className="text-[11px] text-[#A48B73] border-t border-[#E3D5B8]/70 pt-2">
            Tài khoản, mật khẩu và ví phải khớp với nhau mới đăng nhập được.
          </p>
        )}
      </div>

      {/* Input Email */}
      <Input
        label="Địa chỉ Email"
        type="email"
        placeholder="issuer@example.edu.vn"
        leftIcon={<Mail className="w-4 h-4" />}
        error={errors.email?.message}
        autoComplete="email"
        {...register('email')}
      />

      {/* Input Password */}
      <Input
        label="Mật khẩu"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        leftIcon={<Lock className="w-4 h-4" />}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-[#6F5C4A] hover:text-[#010E1C] p-1 transition-colors"
            tabIndex={-1}
            title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        error={errors.password?.message}
        autoComplete="current-password"
        {...register('password')}
      />

      {/* Nút Đăng nhập */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isSubmitting}
        disabled={!address}
        className="w-full gap-2 mt-2"
      >
        <LogIn className="w-4 h-4" />
        <span>Đăng nhập hệ thống</span>
      </Button>

      {!address && (
        <p className="text-center text-[11px] text-[#A48B73]">
          Kết nối ví MetaMask để bật nút đăng nhập.
        </p>
      )}
    </form>
  );
}

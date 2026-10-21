'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/lib/validation';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ApiRequestError } from '@/lib/api';
import { Mail, Lock, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
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

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      const user = await login(data.email, data.password);
      toast.success(`Đăng nhập thành công! Chào mừng ${user.displayName || user.email}`);

      // Điều hướng theo phân quyền vai trò
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/issuer');
      }
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        if (err.status === 401) {
          setServerError('Email hoặc mật khẩu không chính xác.');
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
        className="w-full gap-2 mt-2"
      >
        <LogIn className="w-4 h-4" />
        <span>Đăng nhập hệ thống</span>
      </Button>
    </form>
  );
}

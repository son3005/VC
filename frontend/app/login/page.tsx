'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { LoginForm } from '@/components/forms/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/issuer');
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  return (
    <div className="py-12 sm:py-20 flex-1 flex flex-col justify-center">
      <Container className="max-w-md space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6F5C4A] hover:text-[#010E1C] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Quay lại trang chủ</span>
        </Link>

        {/* Card Đăng nhập */}
        <div className="p-8 sm:p-10 rounded-3xl border-2 border-[#E3D5B8] bg-[#FFFDF7] shadow-md space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 mx-auto relative flex items-center justify-center p-1 bg-[#FAF4DF] rounded-2xl border border-[#E3D5B8] shadow-2xs">
              <Image src="/logo.png" alt="Raccoon University logo" width={42} height={42} priority />
            </div>

            <div className="space-y-1">
              <h1 className="font-serif font-bold text-2xl text-[#010E1C]">
                Đăng nhập hệ thống
              </h1>
              <p className="text-xs text-[#6F5C4A]">
                Cổng quản lý và cấp phát văn bằng dành riêng cho Nhà trường & Đơn vị đào tạo
              </p>
            </div>
          </div>

          <LoginForm />

          <div className="pt-4 border-t border-[#E3D5B8]/60 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#6F5C4A]">
              <Lock className="w-3.5 h-3.5 text-[#E6AB42]" />
              <span>Bảo mật phiên đăng nhập bằng mã thông báo JWT</span>
            </div>
            <p className="text-[11px] text-[#A48B73]">
              Sau khi đăng nhập, đơn vị cấp cần kết nối ví MetaMask tương ứng để ký giao dịch on-chain.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}

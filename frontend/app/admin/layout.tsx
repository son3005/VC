'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { Container } from '@/components/layout/Container';
import { WalletBadge } from '@/components/wallet/WalletBadge';
import { Loader2, LayoutDashboard, Building2, Award, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, role } = useAuth();
  const { address, isCorrectNetwork } = useWallet();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        router.replace('/login');
      } else if (role !== 'admin') {
        router.replace('/issuer');
      }
    }
  }, [isAuthenticated, isLoading, user, role, router]);

  if (isLoading || !user || role !== 'admin') {
    return (
      <div className="py-24 flex-1 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E6AB42] mb-3" />
        <span className="text-sm text-[#6F5C4A]">Đang xác thực quyền Quản trị viên hệ thống...</span>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', label: 'Tổng quan hệ thống', icon: LayoutDashboard, exact: true },
    { href: '/admin/issuers', label: 'Quản lý đơn vị cấp', icon: Building2, exact: false },
    { href: '/admin/certificates', label: 'Toàn bộ văn bằng', icon: Award, exact: false },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Cảnh báo mạng Sepolia */}
      {address && !isCorrectNetwork && (
        <div className="bg-[#E6606A] text-white py-2 px-4 text-xs font-medium text-center">
          Bạn đang ở sai mạng Blockchain. Vui lòng chuyển sang mạng Sepolia để thực hiện thao tác quản trị.
        </div>
      )}

      {/* Admin Sub-header */}
      <div className="border-b border-[#E3D5B8] bg-[#FFFDF7]">
        <Container>
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#010E1C] border border-[#E3D5B8] flex items-center justify-center text-[#E6AB42] shadow-2xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif font-bold text-lg text-[#010E1C]">
                    Quản trị viên Hệ thống
                  </h2>
                  <span className="text-[10px] font-bold bg-[#E6AB42] text-[#010E1C] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Super Admin
                  </span>
                </div>
                <div className="text-xs text-[#6F5C4A]">
                  Tài khoản: <strong className="text-[#010E1C]">{user.displayName || user.email}</strong>
                  {user.walletAddress && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      (Ví Admin: <WalletBadge address={user.walletAddress} />)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Thanh Tab điều hướng */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                      isActive
                        ? 'bg-[#010E1C] text-[#E6AB42] shadow-xs'
                        : 'bg-[#FAF4DF] text-[#6F5C4A] hover:text-[#010E1C] border border-[#E3D5B8]'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </Container>
      </div>

      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}

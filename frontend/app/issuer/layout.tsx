'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { Container } from '@/components/layout/Container';
import { WalletBadge } from '@/components/wallet/WalletBadge';
import { Loader2, PlusCircle, List, Building2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function IssuerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, role } = useAuth();
  const { address, isCorrectNetwork } = useWallet();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        router.replace('/login');
      } else if (role === 'admin') {
        router.replace('/admin');
      } else if (role !== 'issuer') {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, user, role, router]);

  if (isLoading || !user || role === 'admin') {
    return (
      <div className="py-24 flex-1 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E6AB42] mb-3" />
        <span className="text-sm text-[#6F5C4A]">Đang xác thực quyền truy cập đơn vị cấp...</span>
      </div>
    );
  }

  // Kiểm tra cảnh báo ví MetaMask có khớp ví tài khoản không
  const hasWalletMismatch =
    user.walletAddress &&
    address &&
    address.toLowerCase() !== user.walletAddress.toLowerCase();

  const navItems = [
    { href: '/issuer', label: 'Danh sách văn bằng', icon: List, exact: true },
    { href: '/issuer/issue', label: 'Cấp văn bằng mới', icon: PlusCircle, exact: false },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Banner cảnh báo nếu ví không khớp hoặc sai mạng */}
      {address && !isCorrectNetwork && (
        <div className="bg-[#E6606A] text-white py-2 px-4 text-xs font-medium text-center">
          Bạn đang ở sai mạng Blockchain. Vui lòng bấm nút góc trên bên phải để chuyển sang mạng Sepolia.
        </div>
      )}

      {hasWalletMismatch && (
        <div className="bg-[#B23F4A] text-white py-2.5 px-4 text-xs font-medium flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Ví MetaMask đang chọn không khớp với ví của đơn vị này. Vui lòng chuyển đúng ví để ký giao dịch!
          </span>
        </div>
      )}

      {/* Thanh thông tin đơn vị cấp Sub-header */}
      <div className="border-b border-[#E3D5B8] bg-[#FFFDF7]">
        <Container>
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FAF4DF] border border-[#E3D5B8] flex items-center justify-center text-[#E6AB42]">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif font-bold text-lg text-[#010E1C]">
                    {user.displayName || 'Đơn vị cấp văn bằng'}
                  </h2>
                  <span className="text-[10px] font-semibold bg-[#010E1C] text-[#E6AB42] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Nhà trường
                  </span>
                </div>
                {user.walletAddress && (
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#6F5C4A]">
                    <span>Ví cấp phép:</span>
                    <WalletBadge address={user.walletAddress} />
                  </div>
                )}
              </div>
            </div>

            {/* Điều hướng nội bộ */}
            <div className="flex items-center gap-2">
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
                      'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all',
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

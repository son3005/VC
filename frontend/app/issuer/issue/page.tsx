'use client';

import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { IssueWizard } from '@/components/forms/IssueWizard';
import { NetworkGuard } from '@/components/wallet/NetworkGuard';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, PlusCircle, ShieldCheck } from 'lucide-react';

export default function IssueCertificatePage() {
  const { user } = useAuth();

  return (
    <div className="py-8 sm:py-12 flex-1 flex flex-col">
      <Container className="max-w-4xl space-y-6">
        {/* Điều hướng quay lại */}
        <div className="flex items-center justify-between">
          <Link
            href="/issuer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6F5C4A] hover:text-[#010E1C] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Quay lại danh sách văn bằng</span>
          </Link>

          <div className="flex items-center gap-1.5 text-xs text-[#6F5C4A]">
            <ShieldCheck className="w-4 h-4 text-[#E6AB42]" />
            <span>Mạng Ethereum Sepolia</span>
          </div>
        </div>

        {/* Tiêu đề trang */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A48B73]">
            <PlusCircle className="w-3.5 h-3.5 text-[#E6AB42]" />
            <span>Quy trình cấp văn bằng số</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#010E1C]">
            Cấp phát chứng chỉ & văn bằng mới
          </h1>
          <p className="text-xs sm:text-sm text-[#6F5C4A]">
            Thực hiện tuần tự 4 bước: Nhập thông tin, Sinh file PDF + Hash, Ký số on-chain qua MetaMask,
            và Xác nhận đồng bộ dữ liệu vào hệ thống.
          </p>
        </div>

        {/* Network Guard: Bảo vệ yêu cầu mạng và ví hợp lệ */}
        <NetworkGuard expectedWallet={user?.walletAddress}>
          <IssueWizard />
        </NetworkGuard>
      </Container>
    </div>
  );
}

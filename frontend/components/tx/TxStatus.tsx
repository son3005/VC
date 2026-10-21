'use client';

import React from 'react';
import { TxLink } from './TxLink';
import { Loader2, CheckCircle2, AlertOctagon, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TxState = 'idle' | 'prompting' | 'mining' | 'success' | 'rejected' | 'reverted' | 'error';

export interface TxStatusProps {
  state: TxState;
  txHash?: string | null;
  errorMessage?: string | null;
  className?: string;
}

export function TxStatus({ state, txHash, errorMessage, className }: TxStatusProps) {
  if (state === 'idle') return null;

  const configs = {
    prompting: {
      title: 'Đang chờ ký ví MetaMask...',
      desc: 'Vui lòng kiểm tra cửa sổ bật lên của tiện ích MetaMask và xác nhận giao dịch.',
      icon: <Loader2 className="w-5 h-5 text-[#E6AB42] animate-spin shrink-0" />,
      style: 'border-[#E3D5B8] bg-[#FFFDF7] text-[#010E1C]',
    },
    mining: {
      title: 'Giao dịch đang được xác nhận trên Blockchain...',
      desc: 'Đang đợi mạng Ethereum Sepolia đào khối chứa giao dịch của bạn (khoảng 10-20 giây).',
      icon: <Loader2 className="w-5 h-5 text-[#E6AB42] animate-spin shrink-0" />,
      style: 'border-[#E6AB42] bg-[#FAF4DF] text-[#010E1C]',
    },
    success: {
      title: 'Giao dịch thành công trên Blockchain!',
      desc: 'Mã băm và dữ liệu văn bằng đã được ghi nhận vĩnh viễn trên Smart Contract Sepolia.',
      icon: <CheckCircle2 className="w-5 h-5 text-[#E6AB42] shrink-0" />,
      style: 'border-[#E6AB42]/60 bg-[#FAF4DF] text-[#010E1C]',
    },
    rejected: {
      title: 'Bạn đã từ chối ký giao dịch',
      desc: 'Thao tác cấp văn bằng bị hủy bỏ do người dùng bấm từ chối trong cửa sổ MetaMask (Mã lỗi 4001).',
      icon: <XCircle className="w-5 h-5 text-[#B23F4A] shrink-0" />,
      style: 'border-[#E6606A]/40 bg-[#E6606A]/10 text-[#B23F4A]',
    },
    reverted: {
      title: 'Giao dịch bị Reverted bởi Smart Contract',
      desc: errorMessage || 'Hợp đồng thông minh đã từ chối giao dịch (Có thể mã văn bằng đã tồn tại trên chain).',
      icon: <AlertOctagon className="w-5 h-5 text-[#B23F4A] shrink-0" />,
      style: 'border-[#E6606A]/40 bg-[#E6606A]/10 text-[#B23F4A]',
    },
    error: {
      title: 'Có lỗi xảy ra khi thực hiện giao dịch',
      desc: errorMessage || 'Không thể hoàn tất giao dịch ghi dữ liệu on-chain.',
      icon: <AlertOctagon className="w-5 h-5 text-[#B23F4A] shrink-0" />,
      style: 'border-[#E6606A]/40 bg-[#E6606A]/10 text-[#B23F4A]',
    },
  };

  const current = configs[state] || configs.error;

  return (
    <div className={cn('p-4 sm:p-5 rounded-2xl border transition-all space-y-2', current.style, className)}>
      <div className="flex items-start gap-3">
        {current.icon}
        <div className="space-y-1">
          <h4 className="font-serif font-bold text-sm sm:text-base leading-tight">
            {current.title}
          </h4>
          <p className="text-xs leading-relaxed opacity-90">{current.desc}</p>
        </div>
      </div>

      {txHash && (
        <div className="pt-2 border-t border-current/15 flex items-center justify-between text-xs font-mono">
          <span className="opacity-75">Chi tiết Transaction:</span>
          <TxLink txHash={txHash} shortenChars={10} />
        </div>
      )}
    </div>
  );
}

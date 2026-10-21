'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/Button';
import { CHAIN_NAME } from '@/lib/constants';
import { AlertTriangle, Wallet } from 'lucide-react';

export interface NetworkGuardProps {
  expectedWallet?: string | null;
  children: React.ReactNode;
}

export function NetworkGuard({ expectedWallet, children }: NetworkGuardProps) {
  const [mounted, setMounted] = useState(false);
  const { address, isCorrectNetwork, isConnecting, connect, switchToSepolia } = useWallet();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  const hasMetaMask = typeof window !== 'undefined' && !!window.ethereum;

  if (!hasMetaMask) {
    return (
      <div className="p-4 rounded-xl border border-[#E6606A] bg-[#FFFDF7] text-sm text-[#010E1C] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 my-4">
        <div className="flex items-center gap-2 text-[#B23F4A]">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Vui lòng cài đặt tiện ích MetaMask trên trình duyệt để thực hiện thao tác on-chain.</span>
        </div>
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="primary" size="sm">
            Cài MetaMask
          </Button>
        </a>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="p-4 rounded-xl border border-[#E3D5B8] bg-[#FFFDF7] text-sm text-[#010E1C] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 my-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[#E6AB42] shrink-0" />
          <span>Bạn cần kết nối ví MetaMask trước khi thực hiện giao dịch này.</span>
        </div>
        <Button
          variant="primary"
          size="sm"
          isLoading={isConnecting}
          onClick={() => connect()}
        >
          Kết nối ví
        </Button>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="p-4 rounded-xl border border-[#E6606A] bg-[#FFFDF7] text-sm text-[#010E1C] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 my-4">
        <div className="flex items-center gap-2 text-[#B23F4A]">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Bạn đang ở sai mạng. Vui lòng chuyển sang mạng {CHAIN_NAME} để tiếp tục.</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => switchToSepolia()}
        >
          Chuyển sang {CHAIN_NAME}
        </Button>
      </div>
    );
  }

  if (expectedWallet && address.toLowerCase() !== expectedWallet.toLowerCase()) {
    return (
      <div className="p-4 rounded-xl border border-[#E6606A] bg-[#FFFDF7] text-sm text-[#010E1C] flex flex-col gap-2 my-4">
        <div className="flex items-center gap-2 text-[#B23F4A] font-semibold">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Ví đang kết nối không khớp với tài khoản đăng nhập!</span>
        </div>
        <p className="text-xs text-[#6F5C4A]">
          Vui lòng mở MetaMask và chuyển sang đúng tài khoản đã đăng ký với tài khoản này.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

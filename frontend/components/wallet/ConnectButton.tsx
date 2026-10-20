'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/Button';
import { shortenAddress } from '@/lib/format';
import { Wallet, AlertTriangle, ExternalLink } from 'lucide-react';

export function ConnectButton({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { address, isConnecting, isCorrectNetwork, connect, switchToSepolia } = useWallet();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        <Wallet className="w-4 h-4 mr-1 text-[#E6AB42]" />
        <span>Kết nối ví</span>
      </Button>
    );
  }

  const hasMetaMask = typeof window !== 'undefined' && !!window.ethereum;

  // Case 1: Chưa cài MetaMask
  if (!hasMetaMask) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        <Button variant="outline" size="sm" className="gap-1.5 border-[#E6606A] text-[#B23F4A]">
          <span>Cài MetaMask</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </a>
    );
  }

  // Case 2: Chưa kết nối ví
  if (!address) {
    return (
      <Button
        variant="primary"
        size="sm"
        isLoading={isConnecting}
        onClick={() => connect()}
        className={className}
      >
        <Wallet className="w-4 h-4 text-[#E6AB42]" />
        <span>Kết nối ví</span>
      </Button>
    );
  }

  // Case 3: Đã kết nối nhưng sai mạng
  if (!isCorrectNetwork) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => switchToSepolia()}
        className="border-[#E6606A] text-[#B23F4A] hover:bg-[#E6606A]/10 gap-1.5"
      >
        <AlertTriangle className="w-4 h-4 text-[#B23F4A]" />
        <span>Chuyển sang Sepolia</span>
      </Button>
    );
  }

  // Case 4: Đã kết nối đúng mạng Sepolia
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FFFDF7] border border-[#E3D5B8] text-xs font-semibold text-[#010E1C] shadow-2xs"
      title={`Ví: ${address} (Mạng Sepolia)`}
    >
      <span className="w-2 h-2 rounded-full bg-[#E6AB42] animate-pulse" />
      <span className="font-mono">{shortenAddress(address, 4)}</span>
    </div>
  );
}

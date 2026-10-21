'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/Button';
import { shortenAddress } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Wallet,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  LogOut,
  CheckCircle2,
} from 'lucide-react';

export function ConnectButton({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    address,
    isConnecting,
    isCorrectNetwork,
    connect,
    switchToSepolia,
    disconnect,
  } = useWallet();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

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
    <div ref={menuRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FFFDF7] border border-[#E3D5B8] text-xs font-semibold text-[#010E1C] shadow-2xs hover:border-[#E6AB42] transition-colors"
        title="Ví đã kết nối (Mạng Sepolia)"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <span className="w-2 h-2 rounded-full bg-[#E6AB42]" />
        <span className="font-mono">{shortenAddress(address, 4)}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-[#6F5C4A] transition-transform',
            menuOpen && 'rotate-180'
          )}
        />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-72 z-50 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-xl overflow-hidden animate-in fade-in"
        >
          <div className="p-4 border-b border-[#E3D5B8]/70 space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#6F5C4A]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#E6AB42]" />
              <span>Ví đã kết nối</span>
            </div>
            <p className="font-mono text-[11px] text-[#010E1C]">
              {shortenAddress(address, 6)}
            </p>
            <p className="text-[11px] text-[#6F5C4A]">Mạng: Sepolia (11155111)</p>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              await disconnect();
              setMenuOpen(false);
            }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[#B23F4A] hover:bg-[#E6606A]/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Ngắt kết nối ví</span>
          </button>
        </div>
      )}
    </div>
  );
}

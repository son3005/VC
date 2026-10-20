'use client';

import React, { useState } from 'react';
import { shortenAddress } from '@/lib/format';
import { EXPLORER_URL } from '@/lib/constants';
import { Copy, Check, ExternalLink } from 'lucide-react';

export interface WalletBadgeProps {
  address: string;
  showCopy?: boolean;
  showExplorer?: boolean;
  className?: string;
}

export function WalletBadge({
  address,
  showCopy = true,
  showExplorer = true,
  className = '',
}: WalletBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF4DF] border border-[#E3D5B8] text-xs font-mono text-[#010E1C] ${className}`}
    >
      <span>{shortenAddress(address, 4)}</span>

      {showCopy && (
        <button
          onClick={handleCopy}
          className="text-[#6F5C4A] hover:text-[#010E1C] p-0.5 rounded transition-colors"
          title="Sao chép địa chỉ ví"
        >
          {copied ? <Check className="w-3 h-3 text-[#E6AB42]" /> : <Copy className="w-3 h-3" />}
        </button>
      )}

      {showExplorer && (
        <a
          href={`${EXPLORER_URL}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#6F5C4A] hover:text-[#010E1C] p-0.5 rounded transition-colors"
          title="Xem trên Sepolia Etherscan"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { EXPLORER_URL } from '@/lib/constants';
import { shortenAddress } from '@/lib/format';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TxLinkProps {
  txHash: string;
  className?: string;
  shortenChars?: number;
}

export function TxLink({ txHash, className, shortenChars = 6 }: TxLinkProps) {
  if (!txHash) return null;

  return (
    <a
      href={`${EXPLORER_URL}/tx/${txHash}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1 font-mono text-xs text-[#010E1C] hover:text-[#E6AB42] hover:underline transition-colors',
        className
      )}
      title={`Xem giao dịch trên Sepolia Etherscan: ${txHash}`}
    >
      <span>{shortenAddress(txHash, shortenChars)}</span>
      <ExternalLink className="w-3 h-3 opacity-70" />
    </a>
  );
}

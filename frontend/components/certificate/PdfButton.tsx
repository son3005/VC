'use client';

import React, { useState } from 'react';
import { IPFS_GATEWAY } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { FileDown, ExternalLink, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export interface PdfButtonProps {
  cid: string;
  filename?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PdfButton({
  cid,
  filename,
  variant = 'outline',
  size = 'md',
  className,
}: PdfButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const getIpfsUrl = (cidOrUrl: string) => {
    if (!cidOrUrl) return '';
    if (cidOrUrl.startsWith('http://') || cidOrUrl.startsWith('https://')) {
      return cidOrUrl;
    }
    const gateway = IPFS_GATEWAY.endsWith('/') ? IPFS_GATEWAY : `${IPFS_GATEWAY}/`;
    return `${gateway}${cidOrUrl}`;
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!cid) {
      toast.error('Không tìm thấy mã CID của tài liệu IPFS.');
      return;
    }

    const primaryUrl = getIpfsUrl(cid);
    const fallbackUrl = `https://ipfs.io/ipfs/${cid}`;

    setDownloading(true);
    try {
      // Mở file trực tiếp trong tab mới
      window.open(primaryUrl, '_blank', 'noopener,noreferrer');
    } catch {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={downloading}
      className={`gap-2 ${className || ''}`}
      title={filename ? `Mở tài liệu: ${filename}` : 'Tải file văn bằng gốc từ IPFS'}
    >
      {downloading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <FileDown className="w-4 h-4 text-[#E6AB42]" />
      )}
      <span>Tải file gốc (IPFS)</span>
      <ExternalLink className="w-3 h-3 opacity-60" />
    </Button>
  );
}

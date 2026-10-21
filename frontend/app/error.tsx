'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RotateCcw, Home, ShieldAlert } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Ghi log lỗi phía client hoặc gửi lên hệ thống monitoring nếu có
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 sm:py-24 bg-radial-[at_center] from-[#FFFDF7] to-[#FAF4DF]">
      <Container className="max-w-md text-center space-y-6">
        {/* Biểu tượng lỗi */}
        <div className="w-20 h-20 rounded-3xl bg-[#E6606A]/10 border-2 border-[#E6606A]/40 flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle className="w-10 h-10 text-[#B23F4A]" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#B23F4A] bg-[#E6606A]/10 px-3 py-1 rounded-full border border-[#E6606A]/30">
            Sự cố ứng dụng
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#010E1C]">
            Đã xảy ra lỗi không mong muốn
          </h1>
          <p className="text-sm text-[#6F5C4A] leading-relaxed">
            Hệ thống tạm thời gặp sự cố khi xử lý yêu cầu hoặc kết nối máy chủ dữ liệu.
            Vui lòng thử tải lại hoặc liên hệ quản trị viên nếu sự cố tiếp diễn.
          </p>
        </div>

        {/* Nút hành động: Thử lại & Về trang chủ */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => reset()}
            className="w-full sm:w-auto gap-2 justify-center"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Thử lại</span>
          </Button>

          <Link href="/" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="md"
              className="w-full gap-2 justify-center"
            >
              <Home className="w-4 h-4 text-[#E6AB42]" />
              <span>Về Trang chủ</span>
            </Button>
          </Link>
        </div>

        <div className="pt-6 border-t border-[#E3D5B8]/60 flex items-center justify-center gap-2 text-xs text-[#A48B73]">
          <ShieldAlert className="w-4 h-4 text-[#B23F4A]" />
          <span>Mã phân loại: {error.digest || 'ERR_INTERNAL_CLIENT'}</span>
        </div>
      </Container>
    </div>
  );
}

import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { FileQuestion, Home, Search, ShieldCheck } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 sm:py-24 bg-radial-[at_center] from-[#FFFDF7] to-[#FAF4DF]">
      <Container className="max-w-lg text-center space-y-6">
        {/* Biểu tượng 404 */}
        <div className="w-20 h-20 rounded-3xl bg-[#FAF4DF] border-2 border-[#E3D5B8] flex items-center justify-center mx-auto shadow-sm">
          <FileQuestion className="w-10 h-10 text-[#E6AB42]" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#6F5C4A] bg-[#FAF4DF] px-3 py-1 rounded-full border border-[#E3D5B8]">
            Lỗi 404 — Không tìm thấy trang
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#010E1C]">
            Đường dẫn không tồn tại
          </h1>
          <p className="text-sm text-[#6F5C4A] leading-relaxed max-w-md mx-auto">
            Trang hoặc tài liệu văn bằng bạn đang tìm kiếm có thể đã bị xóa, thay đổi mã số,
            hoặc chưa từng tồn tại trên hệ thống xác thực.
          </p>
        </div>

        {/* Nút hành động */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full gap-2 justify-center">
              <Home className="w-4 h-4" />
              <span>Về Trang chủ</span>
            </Button>
          </Link>

          <Link href="/search" className="w-full sm:w-auto">
            <Button variant="outline" size="md" className="w-full gap-2 justify-center">
              <Search className="w-4 h-4 text-[#E6AB42]" />
              <span>Tra cứu văn bằng</span>
            </Button>
          </Link>
        </div>

        {/* Footer bảo đảm */}
        <div className="pt-6 border-t border-[#E3D5B8]/60 flex items-center justify-center gap-2 text-xs text-[#A48B73]">
          <ShieldCheck className="w-4 h-4 text-[#E6AB42]" />
          <span>Hệ thống Xác thực Văn bằng Blockchain — Ethereum Sepolia</span>
        </div>
      </Container>
    </div>
  );
}

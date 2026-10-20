import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Search, FileCheck, ArrowRight, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col justify-center py-16 lg:py-24">
      <Container>
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFDF7] border border-[#E3D5B8] text-xs font-semibold text-[#010E1C] shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-[#E6AB42]" />
            <span>Nền tảng xác thực văn bằng đại học trên Sepolia Blockchain</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-[#010E1C] tracking-tight leading-tight">
            Xác thực chứng chỉ <br />
            <span className="text-[#A48B73] italic">minh bạch & bất biến</span>
          </h1>

          <p className="text-base sm:text-lg text-[#6F5C4A] max-w-2xl mx-auto leading-relaxed">
            Tra cứu và kiểm tra tính hợp lệ của văn bằng tốt nghiệp, chứng chỉ đào tạo thông qua
            mã băm mật mã và chữ ký số được neo trực tiếp trên Ethereum blockchain.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/search" className="w-full sm:w-auto">
              <Button size="lg" variant="primary" className="w-full sm:w-auto gap-2">
                <Search className="w-4 h-4" />
                <span>Tra cứu văn bằng</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>

            <Link href="/verify" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">
                <FileCheck className="w-4 h-4 text-[#E6AB42]" />
                <span>Xác thực bằng file PDF</span>
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}

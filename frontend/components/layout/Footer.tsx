import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Container } from './Container';
import { CONTRACT_ADDRESS, EXPLORER_URL, SCHOOL_NAME } from '@/lib/constants';
import { shortenAddress } from '@/lib/format';
import { ExternalLink, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-[#E3D5B8] bg-[#FAF4DF] text-[#6F5C4A] mt-auto">
      <Container className="py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Brand & Intro */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt={`${SCHOOL_NAME} logo`}
                width={32}
                height={32}
              />
              <span className="font-serif font-bold text-lg text-[#010E1C]">
                {SCHOOL_NAME}
              </span>
            </div>
            <p className="text-sm max-w-md leading-relaxed text-[#6F5C4A]">
              Hệ thống lưu trữ và xác thực văn bằng, chứng chỉ trực tuyến dựa trên công nghệ
              Blockchain Ethereum Sepolia và mạng lưới phi tập trung IPFS, đảm bảo tính minh bạch,
              bảo mật và không thể làm giả.
            </p>
            {CONTRACT_ADDRESS && (
              <div className="flex items-center gap-2 text-xs text-[#010E1C] bg-[#FFFDF7] p-2.5 rounded-xl border border-[#E3D5B8] w-fit">
                <ShieldCheck className="w-4 h-4 text-[#E6AB42] shrink-0" />
                <span>Smart Contract:</span>
                <a
                  href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-medium hover:text-[#E6AB42] underline flex items-center gap-1"
                >
                  {shortenAddress(CONTRACT_ADDRESS, 6)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Col 2: Liên kết nhanh */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#010E1C]">
              Tra cứu & Xác thực
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-[#010E1C] transition-colors">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-[#010E1C] transition-colors">
                  Tra cứu văn bằng
                </Link>
              </li>
              <li>
                <Link href="/verify" className="hover:text-[#010E1C] transition-colors">
                  Xác thực file PDF
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Dành cho Nhà trường */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#010E1C]">
              Dành cho Đơn vị
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/login" className="hover:text-[#010E1C] transition-colors">
                  Đăng nhập đơn vị cấp
                </Link>
              </li>
              <li>
                <a
                  href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}#code`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#010E1C] transition-colors inline-flex items-center gap-1"
                >
                  Mã nguồn Hợp đồng
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#E3D5B8] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} {SCHOOL_NAME}. Tất cả quyền được bảo lưu.</p>
          <p className="text-[#A48B73]">
            Mạng thử nghiệm: <span className="font-semibold text-[#010E1C]">Ethereum Sepolia</span> (11155111)
          </p>
        </div>
      </Container>
    </footer>
  );
}

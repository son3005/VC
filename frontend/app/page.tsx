'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { SearchBar } from '@/components/search/SearchBar';
import { RecentCertificates } from '@/components/search/RecentCertificates';
import { Button } from '@/components/ui/Button';
import {
  ShieldCheck,
  FileCheck2,
  LogIn,
  Layers,
  Database,
  Search,
  ArrowRight,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (query: string) => {
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/search');
    }
  };

  const steps = [
    {
      step: '01',
      title: 'Cấp chứng chỉ & Ký số',
      desc: 'Nhà trường nhập thông tin sinh viên, hệ thống tự động sinh văn bằng chuẩn PDF và đơn vị cấp ký xác nhận giao dịch qua MetaMask on-chain.',
      icon: <Layers className="w-5 h-5 text-[#E6AB42]" />,
    },
    {
      step: '02',
      title: 'Lưu IPFS & Neo Hash',
      desc: 'File văn bằng gốc được lưu trữ phi tập trung trên mạng lưới IPFS. Mã băm SHA-256 được ghi vĩnh viễn lên Smart Contract Ethereum Sepolia.',
      icon: <Database className="w-5 h-5 text-[#E6AB42]" />,
    },
    {
      step: '03',
      title: 'Tra cứu & Xác minh tức thì',
      desc: 'Sinh viên, doanh nghiệp và nhà tuyển dụng có thể tra cứu trực tiếp theo mã bằng, MSSV hoặc tải file PDF để kiểm tra tính toàn vẹn 100%.',
      icon: <Search className="w-5 h-5 text-[#E6AB42]" />,
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24 border-b border-[#E3D5B8]/80 bg-radial-[at_top_center] from-[#FFFDF7] to-[#FAF4DF]">
        <Container>
          <div className="max-w-3xl mx-auto text-center space-y-8">
            {/* Tagline */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFFDF7] border border-[#E3D5B8] text-xs font-semibold text-[#010E1C] shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-[#E6AB42]" />
              <span>Hệ thống Xác thực Văn bằng Đại học trên Ethereum Sepolia</span>
            </div>

            {/* Main Title */}
            <div className="space-y-3">
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-[#010E1C] tracking-tight leading-tight">
                Xác thực chứng chỉ <br />
                <span className="text-[#A48B73] italic">bằng blockchain</span>
              </h1>
              <p className="text-base sm:text-lg text-[#6F5C4A] max-w-2xl mx-auto leading-relaxed">
                Minh bạch, chống gian lận và tra cứu tức thì thông qua dữ liệu neo mật mã trên chuỗi khối
                Ethereum Sepolia và mạng lưu trữ phi tập trung IPFS.
              </p>
            </div>

            {/* Search Bar Lớn */}
            <div className="pt-2">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={handleSearchSubmit}
                size="large"
                placeholder="Nhập Mã văn bằng (VD: UIT-DEG-2026-0001), Họ tên, hoặc MSSV rồi nhấn Enter..."
              />
              <p className="text-xs text-[#6F5C4A] mt-2 text-left sm:text-center pl-2">
                Gợi ý: Nhấn phím <kbd className="font-mono bg-[#FFFDF7] px-1.5 py-0.5 rounded border border-[#E3D5B8] text-[11px]">/</kbd> để mở nhanh ô tìm kiếm.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link href="/verify">
                <Button variant="outline" size="md" className="gap-2">
                  <FileCheck2 className="w-4 h-4 text-[#E6AB42]" />
                  <span>Tra cứu bằng file PDF</span>
                </Button>
              </Link>

              <Link href="/login">
                <Button variant="primary" size="md" className="gap-2">
                  <LogIn className="w-4 h-4 text-[#E6AB42]" />
                  <span>Đăng nhập nhà trường</span>
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* 3 Bước Quy Trình */}
      <section className="py-16 md:py-20 border-b border-[#E3D5B8]/80 bg-[#FFFDF7]">
        <Container>
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#010E1C]">
              Quy trình hoạt động
            </h2>
            <p className="text-sm text-[#6F5C4A]">
              Công nghệ blockchain bảo đảm dữ liệu văn bằng không thể bị can thiệp hay làm giả
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((item, idx) => (
              <div
                key={item.step}
                className="relative p-6 rounded-2xl border border-[#E3D5B8] bg-[#FAF4DF]/60 hover:bg-[#FAF4DF] transition-all space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#FFFDF7] border border-[#E3D5B8] flex items-center justify-center shadow-2xs">
                    {item.icon}
                  </div>
                  <span className="font-mono text-2xl font-bold text-[#A48B73]/40">
                    {item.step}
                  </span>
                </div>

                <h3 className="font-serif text-lg font-bold text-[#010E1C]">
                  {item.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#6F5C4A] leading-relaxed">
                  {item.desc}
                </p>

                {idx < 2 && (
                  <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-[#A48B73]/50">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Recent Certificates Widget */}
      <section className="py-16 md:py-20 bg-[#FAF4DF]">
        <Container>
          <RecentCertificates />
        </Container>
      </section>
    </div>
  );
}

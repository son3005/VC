'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/certificate/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDateOnly, shortenAddress } from '@/lib/format';
import { EXPLORER_URL } from '@/lib/constants';
import { Award, ArrowUpRight, Clock, ExternalLink } from 'lucide-react';

export function RecentCertificates() {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['recentCertificates'],
    queryFn: () => api.recentCertificates(6),
    staleTime: 30 * 1000,
  });

  if (isError) {
    // Kế hoạch: Nếu lỗi → ẩn widget
    return null;
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FFFDF7] border border-[#E3D5B8] flex items-center justify-center text-[#E6AB42]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-[#010E1C]">
              Văn bằng vừa cấp mới nhất
            </h3>
            <p className="text-xs text-[#6F5C4A]">
              Các chứng chỉ được neo thành công trên mạng lưới Ethereum Sepolia
            </p>
          </div>
        </div>

        <Link
          href="/search"
          className="text-xs font-semibold text-[#010E1C] hover:text-[#E6AB42] transition-colors flex items-center gap-1 group"
        >
          <span>Xem tất cả</span>
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] space-y-3"
            >
              <div className="flex justify-between items-start">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <div className="pt-2 border-t border-[#E3D5B8]/40 flex justify-between items-center">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.data.map((cert) => (
            <div
              key={cert.certificateId}
              onClick={() => router.push(`/c/${encodeURIComponent(cert.certificateId)}`)}
              className="group block p-5 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] hover:border-[#E6AB42] hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="font-mono text-xs font-semibold text-[#6F5C4A] bg-[#FAF4DF] px-2.5 py-1 rounded-lg border border-[#E3D5B8]">
                  {cert.certificateId}
                </span>
                <StatusBadge status={cert.status} size="sm" />
              </div>

              <div className="space-y-1 mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#E6AB42] shrink-0" />
                  <h4 className="font-serif font-bold text-base text-[#010E1C] group-hover:text-[#E6AB42] transition-colors line-clamp-1">
                    {cert.studentNameMasked}
                  </h4>
                </div>
                <p className="text-xs text-[#6F5C4A] pl-6">
                  MSSV: <span className="font-mono">{cert.studentCodeMasked}</span>
                  {cert.major && ` • ${cert.major}`}
                  {cert.graduationYear && ` (${cert.graduationYear})`}
                </p>
              </div>

              <div className="pt-3 border-t border-[#E3D5B8]/60 flex items-center justify-between text-[11px] text-[#6F5C4A]">
                <span>Ngày cấp: {formatDateOnly(cert.issuedAt)}</span>
                {cert.txHash && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="flex items-center gap-1 font-mono hover:text-[#010E1C]"
                  >
                    <a
                      href={`${EXPLORER_URL}/tx/${cert.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 hover:underline"
                    >
                      <span>Tx: {shortenAddress(cert.txHash, 3)}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center rounded-2xl border border-dashed border-[#E3D5B8] bg-[#FFFDF7]/50 text-sm text-[#6F5C4A]">
          Chưa có chứng chỉ nào được cấp gần đây trên hệ thống.
        </div>
      )}
    </section>
  );
}

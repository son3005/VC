'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/certificate/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { formatDateOnly } from '@/lib/format';
import { CERTIFICATE_TYPE_LABELS } from '@/lib/constants';
import {
  Award,
  Building2,
  Users,
  ArrowRight,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();

  // Gọi thống kê tổng quan
  const { data: statsData, isLoading: isStatsLoading, isError: isStatsError, refetch } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => api.adminStats(),
    staleTime: 15 * 1000,
  });

  // Gọi danh sách văn bằng gần đây
  const queryParams = new URLSearchParams({ page: '1', limit: '5' });
  const { data: certsData, isLoading: isCertsLoading } = useQuery({
    queryKey: ['adminRecentCertificates'],
    queryFn: () => api.adminCertificates(queryParams),
    staleTime: 15 * 1000,
  });

  const stats = statsData?.data;
  const recentCerts = certsData?.data || [];

  return (
    <div className="py-8 sm:py-12 flex-1 flex flex-col">
      <Container className="space-y-8">
        {/* Tiêu đề & Hành động nhanh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#010E1C]">
              Trung tâm Thống kê & Quản trị Hệ thống
            </h1>
            <p className="text-xs sm:text-sm text-[#6F5C4A]">
              Theo dõi số liệu thời gian thực về các đơn vị đào tạo, tài khoản và văn bằng neo trên blockchain
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/admin/issuers">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Building2 className="w-4 h-4 text-[#E6AB42]" />
                <span>Xem đơn vị cấp</span>
              </Button>
            </Link>

            <Link href="/admin/certificates">
              <Button variant="primary" size="sm" className="gap-1.5">
                <Award className="w-4 h-4 text-[#E6AB42]" />
                <span>Quản lý văn bằng</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Thẻ số liệu chính */}
        {isStatsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : isStatsError || !stats ? (
          <EmptyState
            title="Không thể tải số liệu thống kê"
            description="Đã có lỗi khi kết nối tới hệ thống backend. Vui lòng tải lại."
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Thử lại
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            {/* Lưới 4 Card chính */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Tổng số văn bằng */}
              <div className="p-5 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#6F5C4A]">
                  <span>Tổng số văn bằng</span>
                  <Award className="w-4 h-4 text-[#E6AB42]" />
                </div>
                <div className="font-serif text-3xl font-bold text-[#010E1C]">
                  {stats.certificates.total.toLocaleString()}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#6F5C4A] pt-1 border-t border-[#E3D5B8]/40">
                  <span className="text-[#010E1C] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E6AB42]" />
                    {stats.certificates.active} Hợp lệ
                  </span>
                  <span className="text-[#B23F4A] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B23F4A]" />
                    {stats.certificates.revoked} Đã thu hồi
                  </span>
                </div>
              </div>

              {/* Đơn vị cấp văn bằng */}
              <div className="p-5 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#6F5C4A]">
                  <span>Đơn vị đào tạo (Issuers)</span>
                  <Building2 className="w-4 h-4 text-[#E6AB42]" />
                </div>
                <div className="font-serif text-3xl font-bold text-[#010E1C]">
                  {stats.issuers.total.toLocaleString()}
                </div>
                <p className="text-[11px] text-[#6F5C4A] pt-1 border-t border-[#E3D5B8]/40">
                  <strong className="text-[#010E1C]">{stats.issuers.active}</strong> đơn vị đang hoạt động
                </p>
              </div>

              {/* Người dùng hệ thống */}
              <div className="p-5 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#6F5C4A]">
                  <span>Tài khoản người dùng</span>
                  <Users className="w-4 h-4 text-[#E6AB42]" />
                </div>
                <div className="font-serif text-3xl font-bold text-[#010E1C]">
                  {stats.users.toLocaleString()}
                </div>
                <p className="text-[11px] text-[#6F5C4A] pt-1 border-t border-[#E3D5B8]/40">
                  Tài khoản được phân quyền
                </p>
              </div>

              {/* Tỷ lệ hợp lệ */}
              <div className="p-5 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#6F5C4A]">
                  <span>Tỷ lệ hợp lệ on-chain</span>
                  <TrendingUp className="w-4 h-4 text-[#E6AB42]" />
                </div>
                <div className="font-serif text-3xl font-bold text-[#010E1C]">
                  {stats.certificates.total > 0
                    ? `${Math.round((stats.certificates.active / stats.certificates.total) * 100)}%`
                    : '100%'}
                </div>
                <p className="text-[11px] text-[#6F5C4A] pt-1 border-t border-[#E3D5B8]/40">
                  Văn bằng chưa bị thu hồi
                </p>
              </div>
            </div>

            {/* Phân loại theo loại văn bằng (byType) */}
            <div className="p-6 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-2xs space-y-4">
              <h3 className="font-serif font-bold text-lg text-[#010E1C]">
                Phân bố số lượng theo loại chứng chỉ
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(['degree', 'course', 'credit', 'other'] as const).map((type) => {
                  const count = stats.byType?.[type] || 0;
                  const label = CERTIFICATE_TYPE_LABELS[type];

                  return (
                    <div
                      key={type}
                      className="p-4 rounded-xl bg-[#FAF4DF]/60 border border-[#E3D5B8]/60 space-y-1"
                    >
                      <span className="text-xs text-[#6F5C4A] block truncate">{label}</span>
                      <div className="font-serif text-2xl font-bold text-[#010E1C]">
                        {count.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Danh sách văn bằng cấp gần đây */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold text-[#010E1C]">
              Văn bằng phát hành gần đây nhất
            </h3>

            <Link
              href="/admin/certificates"
              className="text-xs font-semibold text-[#010E1C] hover:text-[#E6AB42] transition-colors flex items-center gap-1 group"
            >
              <span>Xem toàn bộ</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {isCertsLoading ? (
            <div className="p-6 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : recentCerts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-[#E3D5B8] bg-[#FFFDF7]/60 text-xs text-[#6F5C4A]">
              Chưa có văn bằng nào được phát hành trong hệ thống.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[#010E1C] border-collapse">
                  <thead className="bg-[#FAF4DF] border-b border-[#E3D5B8] text-xs uppercase tracking-wider text-[#6F5C4A]">
                    <tr>
                      <th scope="col" className="px-5 py-3.5 font-semibold">
                        Mã văn bằng
                      </th>
                      <th scope="col" className="px-5 py-3.5 font-semibold">
                        Người được cấp
                      </th>
                      <th scope="col" className="px-5 py-3.5 font-semibold">
                        Loại / Ngành
                      </th>
                      <th scope="col" className="px-5 py-3.5 font-semibold">
                        Ngày cấp
                      </th>
                      <th scope="col" className="px-5 py-3.5 font-semibold text-center">
                        Trạng thái
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-right">
                        Chi tiết
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3D5B8]/60">
                    {recentCerts.map((cert) => {
                      const typeLabel =
                        CERTIFICATE_TYPE_LABELS[cert.certificateType] || cert.certificateType;

                      return (
                        <tr
                          key={cert.certificateId}
                          onClick={() => router.push(`/c/${encodeURIComponent(cert.certificateId)}`)}
                          className="hover:bg-[#FAF4DF]/60 cursor-pointer transition-colors group"
                        >
                          <td className="px-5 py-4 whitespace-nowrap font-mono text-xs font-bold">
                            {cert.certificateId}
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap font-serif font-bold text-sm group-hover:text-[#E6AB42] transition-colors">
                            {cert.studentName}
                          </td>

                          <td className="px-5 py-4 text-xs">
                            <span className="font-semibold text-[#010E1C] block">{typeLabel}</span>
                            <span className="text-[#6F5C4A]">{cert.major || '—'}</span>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap text-xs text-[#6F5C4A]">
                            {formatDateOnly(cert.issuedAt)}
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            <StatusBadge status={cert.status} size="sm" />
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <div className="w-7 h-7 rounded-lg bg-[#FAF4DF] border border-[#E3D5B8] flex items-center justify-center text-[#6F5C4A] group-hover:bg-[#010E1C] group-hover:text-[#E6AB42] transition-all ml-auto">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}

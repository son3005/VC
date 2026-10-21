'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/certificate/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';
import { formatDateOnly, shortenAddress } from '@/lib/format';
import { CERTIFICATE_TYPE_LABELS, EXPLORER_URL } from '@/lib/constants';
import {
  Award,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ChevronRight as ArrowRightIcon,
  FileCheck,
} from 'lucide-react';

export default function IssuerDashboardPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);

  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('limit', limit.toString());
  if (debouncedSearch.trim()) queryParams.set('q', debouncedSearch.trim());
  if (statusFilter && statusFilter !== 'all') queryParams.set('status', statusFilter);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['issuerCertificates', queryParams.toString()],
    queryFn: () => api.issuerCertificates(queryParams),
    staleTime: 10 * 1000,
  });

  const certificates = data?.data || [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages || 1;
  const totalCount = meta?.total || certificates.length;

  // Tính thống kê nhanh
  const activeCount = certificates.filter((c) => c.status === 'active').length;
  const revokedCount = certificates.filter((c) => c.status === 'revoked').length;

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Đang hiệu lực' },
    { value: 'revoked', label: 'Đã thu hồi' },
  ];

  return (
    <div className="py-8 sm:py-12 flex-1 flex flex-col">
      <Container className="space-y-8">
        {/* Tiêu đề & Nút Cấp mới */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#010E1C]">
              Quản lý văn bằng đã cấp
            </h1>
            <p className="text-xs sm:text-sm text-[#6F5C4A]">
              Danh sách tất cả các chứng chỉ và văn bằng do đơn vị của bạn phát hành và neo trên blockchain
            </p>
          </div>

          <Link href="/issuer/issue">
            <Button variant="primary" size="md" className="gap-2 shadow-sm">
              <PlusCircle className="w-4 h-4 text-[#E6AB42]" />
              <span>Cấp văn bằng mới</span>
            </Button>
          </Link>
        </div>

        {/* 3 Thẻ thống kê */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tổng số */}
          <div className="p-5 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#6F5C4A]">
              <span>Tổng số văn bằng</span>
              <Award className="w-4 h-4 text-[#E6AB42]" />
            </div>
            <div className="font-serif text-3xl font-bold text-[#010E1C]">
              {isLoading ? <Skeleton className="h-9 w-16" /> : totalCount}
            </div>
            <p className="text-[11px] text-[#A48B73]">Đã phát hành và neo on-chain</p>
          </div>

          {/* Đang hiệu lực */}
          <div className="p-5 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#6F5C4A]">
              <span>Đang hiệu lực (Active)</span>
              <CheckCircle2 className="w-4 h-4 text-[#E6AB42]" />
            </div>
            <div className="font-serif text-3xl font-bold text-[#010E1C]">
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                statusFilter === 'active' ? totalCount : activeCount
              )}
            </div>
            <p className="text-[11px] text-[#A48B73]">Hợp lệ, chưa bị thu hồi</p>
          </div>

          {/* Đã thu hồi */}
          <div className="p-5 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#6F5C4A]">
              <span>Đã thu hồi (Revoked)</span>
              <AlertOctagon className="w-4 h-4 text-[#B23F4A]" />
            </div>
            <div className="font-serif text-3xl font-bold text-[#B23F4A]">
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                statusFilter === 'revoked' ? totalCount : revokedCount
              )}
            </div>
            <p className="text-[11px] text-[#A48B73]">Bị hủy bỏ giá trị pháp lý</p>
          </div>
        </div>

        {/* Thanh tìm kiếm & Lọc */}
        <div className="p-4 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <Input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo Mã, Tên người học, hoặc MSSV..."
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="w-full sm:w-56">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={statusOptions}
            />
          </div>
        </div>

        {/* Bảng danh sách văn bằng */}
        {isLoading ? (
          <div className="p-6 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title="Lỗi tải dữ liệu văn bằng"
            description="Không thể kết nối đến máy chủ để lấy danh sách văn bằng của đơn vị. Vui lòng thử lại."
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Tải lại
              </Button>
            }
          />
        ) : certificates.length === 0 ? (
          <EmptyState
            icon={<FileCheck className="w-8 h-8 text-[#A48B73]" />}
            title={debouncedSearch || statusFilter !== 'all' ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có văn bằng nào được cấp'}
            description={
              debouncedSearch || statusFilter !== 'all'
                ? 'Không có chứng chỉ nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại.'
                : 'Đơn vị của bạn chưa cấp phát văn bằng nào trên hệ thống. Hãy bắt đầu bằng cách cấp chứng chỉ đầu tiên.'
            }
            action={
              !debouncedSearch && statusFilter === 'all' ? (
                <Link href="/issuer/issue">
                  <Button variant="primary" size="sm" className="gap-1.5">
                    <PlusCircle className="w-4 h-4" />
                    <span>Cấp văn bằng ngay</span>
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[#010E1C] border-collapse">
                  <thead className="bg-[#FAF4DF] border-b border-[#E3D5B8] text-xs uppercase tracking-wider text-[#6F5C4A]">
                    <tr>
                      <th scope="col" className="px-5 py-3.5 font-semibold">
                        Mã văn bằng / MSSV
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
                      <th scope="col" className="px-5 py-3.5 font-semibold">
                        Giao dịch on-chain
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-right">
                        Chi tiết
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3D5B8]/60">
                    {certificates.map((cert) => {
                      const typeLabel =
                        CERTIFICATE_TYPE_LABELS[cert.certificateType] || cert.certificateType;

                      return (
                        <tr
                          key={cert.certificateId}
                          onClick={() => router.push(`/issuer/certificates/${encodeURIComponent(cert.certificateId)}`)}
                          className="hover:bg-[#FAF4DF]/60 cursor-pointer transition-colors group"
                        >
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-[#010E1C]">
                              {cert.certificateId}
                            </span>
                            <div className="text-xs text-[#6F5C4A] font-mono">
                              MSSV: {cert.studentCode}
                            </div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="font-serif font-bold text-sm text-[#010E1C] group-hover:text-[#E6AB42] transition-colors">
                              {cert.studentName}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="text-xs font-semibold text-[#010E1C]">
                              {typeLabel}
                            </div>
                            <div className="text-xs text-[#6F5C4A] line-clamp-1">
                              {cert.major || '—'}
                            </div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap text-xs text-[#6F5C4A]">
                            {formatDateOnly(cert.issuedAt)}
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            <StatusBadge status={cert.status} size="sm" />
                          </td>

                          <td
                            className="px-5 py-4 whitespace-nowrap text-xs font-mono"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {cert.txHash ? (
                              <a
                                href={`${EXPLORER_URL}/tx/${cert.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[#6F5C4A] hover:text-[#010E1C] hover:underline"
                                title={cert.txHash}
                              >
                                <span>{shortenAddress(cert.txHash, 4)}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span>—</span>
                            )}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <div className="w-7 h-7 rounded-lg bg-[#FAF4DF] border border-[#E3D5B8] flex items-center justify-center text-[#6F5C4A] group-hover:bg-[#010E1C] group-hover:text-[#E6AB42] transition-all ml-auto">
                              <ArrowRightIcon className="w-4 h-4" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-[#E3D5B8]/60">
                <p className="text-xs text-[#6F5C4A]">
                  Trang <strong className="text-[#010E1C]">{page}</strong> /{' '}
                  <strong className="text-[#010E1C]">{totalPages}</strong> (Tổng cộng {totalCount} văn bằng)
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Trang trước</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="gap-1"
                  >
                    <span>Trang sau</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Container>
    </div>
  );
}

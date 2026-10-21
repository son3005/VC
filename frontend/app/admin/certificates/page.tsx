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
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { TxStatus, type TxState } from '@/components/tx/TxStatus';
import { TxLink } from '@/components/tx/TxLink';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';
import { revokeCertificateOnChain, assertCorrectNetworkAndSigner } from '@/lib/contract';
import { formatDateOnly } from '@/lib/format';
import { CERTIFICATE_TYPE_LABELS } from '@/lib/constants';
import type { CertificateIssuer } from '@/types/api';
import {
  Award,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminCertificatesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isCorrectNetwork, switchToSepolia } = useWallet();

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);

  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modal Thu hồi văn bằng khẩn cấp bởi Admin
  const [revokingCert, setRevokingCert] = useState<CertificateIssuer | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [txState, setTxState] = useState<TxState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('limit', limit.toString());
  if (debouncedSearch.trim()) queryParams.set('q', debouncedSearch.trim());
  if (statusFilter && statusFilter !== 'all') queryParams.set('status', statusFilter);
  if (typeFilter) queryParams.set('type', typeFilter);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['adminCertificates', queryParams.toString()],
    queryFn: () => api.adminCertificates(queryParams),
    staleTime: 10 * 1000,
  });

  const certificates = data?.data || [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages || 1;
  const totalCount = meta?.total || certificates.length;

  const handleOpenRevokeModal = (cert: CertificateIssuer, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevokingCert(cert);
    setConfirmInput('');
    setTxState('idle');
    setTxHash(null);
    setTxError(null);
  };

  const handleConfirmRevoke = async () => {
    if (!revokingCert || confirmInput.trim() !== revokingCert.certificateId) {
      toast.error('Mã văn bằng xác nhận không khớp.');
      return;
    }

    setTxError(null);
    setTxState('prompting');
    setIsRevoking(true);

    try {
      await assertCorrectNetworkAndSigner(user?.walletAddress);

      const tx = await revokeCertificateOnChain(revokingCert.certificateId);
      setTxHash(tx);
      setTxState('mining');

      await api.revokeCertificate(revokingCert.certificateId, tx);

      setTxState('success');
      toast.success('Đã thu hồi văn bằng thành công với quyền Admin!');

      setTimeout(() => {
        setRevokingCert(null);
        setTxState('idle');
        refetch();
      }, 1500);
    } catch (err: unknown) {
      const errorObj = err as { code?: number | string; message?: string };
      if (errorObj?.code === 4001 || errorObj?.message?.includes('user rejected')) {
        setTxState('rejected');
        setTxError('Bạn đã hủy ký giao dịch thu hồi.');
        toast.error('Giao dịch bị từ chối.');
      } else {
        setTxState('error');
        setTxError(errorObj?.message || 'Có lỗi xảy ra khi thu hồi văn bằng.');
        toast.error('Thu hồi văn bằng thất bại.');
      }
    } finally {
      setIsRevoking(false);
    }
  };

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Hợp lệ' },
    { value: 'revoked', label: 'Đã thu hồi' },
  ];

  const typeOptions = [
    { value: '', label: 'Tất cả loại văn bằng' },
    ...Object.entries(CERTIFICATE_TYPE_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  return (
    <div className="py-8 sm:py-12 flex-1 flex flex-col">
      <Container className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#010E1C]">
              Toàn bộ Văn bằng trong Hệ thống
            </h1>
            <p className="text-xs sm:text-sm text-[#6F5C4A]">
              Quản lý, tra cứu và thực thi quyền thu hồi khẩn cấp cho tất cả các văn bằng do mọi đơn vị phát hành
            </p>
          </div>
        </div>

        {/* Thanh tìm kiếm & Bộ lọc */}
        <div className="p-4 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo Mã bằng, Tên người học, hoặc MSSV..."
            leftIcon={<Search className="w-4 h-4" />}
          />

          <Select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            options={typeOptions}
          />

          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={statusOptions}
          />
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
            description="Không thể kết nối đến máy chủ. Vui lòng thử lại."
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Tải lại
              </Button>
            }
          />
        ) : certificates.length === 0 ? (
          <EmptyState
            icon={<Award className="w-8 h-8 text-[#A48B73]" />}
            title="Không tìm thấy văn bằng phù hợp"
            description="Không có văn bằng nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại."
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
                        Thao tác
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
                          onClick={() => router.push(`/c/${encodeURIComponent(cert.certificateId)}`)}
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

                          <td
                            className="px-5 py-4 whitespace-nowrap text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {cert.txHash ? (
                              <TxLink txHash={cert.txHash} shortenChars={4} />
                            ) : (
                              <span>—</span>
                            )}
                          </td>

                          <td
                            className="px-4 py-4 whitespace-nowrap text-right text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              {cert.status === 'active' && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={(e) => handleOpenRevokeModal(cert, e)}
                                  className="h-7 text-xs px-2"
                                  title="Thu hồi văn bằng"
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  <span>Thu hồi</span>
                                </Button>
                              )}

                              <Link
                                href={`/c/${encodeURIComponent(cert.certificateId)}`}
                                target="_blank"
                                className="p-1.5 text-[#6F5C4A] hover:text-[#010E1C] rounded-lg hover:bg-[#FAF4DF] transition-colors"
                                title="Mở trang chi tiết công khai"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
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

        {/* Modal Thu hồi quyền Admin */}
        <Modal
          isOpen={!!revokingCert}
          onClose={() => {
            if (!isRevoking) {
              setRevokingCert(null);
              setTxState('idle');
            }
          }}
          title="Thu hồi văn bằng khẩn cấp (Quyền Quản trị viên)"
          maxWidth="md"
        >
          {revokingCert && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl border border-[#E6606A] bg-[#E6606A]/10 text-xs text-[#B23F4A] flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <strong>CẢNH BÁO: HÀNH ĐỘNG KHÔNG THỂ HOÀN TÁC!</strong>
                  <p>
                    Bạn đang thực hiện quyền hạn Quản trị viên tối cao để thu hồi văn bằng{' '}
                    <strong>{revokingCert.certificateId}</strong> của sinh viên{' '}
                    <strong>{revokingCert.studentName}</strong>. Trạng thái trên Smart Contract Sepolia sẽ
                    chuyển sang vô hiệu lực vĩnh viễn.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-[#010E1C]">
                <p>
                  Vui lòng nhập lại mã văn bằng{' '}
                  <strong className="font-mono text-[#B23F4A] select-all bg-[#FAF4DF] px-1.5 py-0.5 rounded border border-[#E3D5B8]">
                    {revokingCert.certificateId}
                  </strong>{' '}
                  để xác nhận:
                </p>
                <Input
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="Nhập mã văn bằng..."
                  className="font-mono"
                  disabled={isRevoking}
                />
              </div>

              <TxStatus state={txState} txHash={txHash} errorMessage={txError} />

              {!isCorrectNetwork && (
                <div className="p-3 rounded-xl bg-[#E6606A]/10 text-xs text-[#B23F4A] flex items-center justify-between">
                  <span>Cần chuyển sang mạng Sepolia để ký giao dịch.</span>
                  <Button variant="danger" size="sm" onClick={() => switchToSepolia()}>
                    Đổi mạng
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E3D5B8]/60">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setRevokingCert(null)}
                  disabled={isRevoking}
                >
                  Hủy bỏ
                </Button>

                <Button
                  variant="danger"
                  size="md"
                  isLoading={isRevoking}
                  disabled={confirmInput.trim() !== revokingCert.certificateId || !isCorrectNetwork}
                  onClick={handleConfirmRevoke}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xác nhận thu hồi</span>
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </Container>
    </div>
  );
}

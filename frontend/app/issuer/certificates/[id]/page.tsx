'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Container } from '@/components/layout/Container';
import { StatusBadge } from '@/components/certificate/StatusBadge';
import { TxStatus, type TxState } from '@/components/tx/TxStatus';
import { TxLink } from '@/components/tx/TxLink';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { api, ApiRequestError } from '@/lib/api';
import {
  revokeCertificateOnChain,
  assertCorrectNetworkAndSigner,
} from '@/lib/contract';
import { formatDate, formatDateOnly } from '@/lib/format';
import { CERTIFICATE_TYPE_LABELS } from '@/lib/constants';
import {
  ChevronLeft,
  AlertTriangle,
  AlertOctagon,
  ExternalLink,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function IssuerCertificateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const certificateId = decodeURIComponent((params.id as string) || '');

  const { user } = useAuth();
  const { isCorrectNetwork, switchToSepolia } = useWallet();

  // State Modal Thu hồi
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeTxState, setRevokeTxState] = useState<TxState>('idle');
  const [revokeTxHash, setRevokeTxHash] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const {
    data: certData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['issuerCertificateDetail', certificateId],
    queryFn: () => api.issuerCertificate(certificateId),
    enabled: !!certificateId,
    staleTime: 10 * 1000,
  });

  const cert = certData?.data;
  const isRevoked = cert?.status === 'revoked';

  // Xử lý thu hồi on-chain + gọi API backend
  const handleConfirmRevoke = async () => {
    if (confirmInput.trim() !== certificateId) {
      toast.error('Mã văn bằng xác nhận không trùng khớp.');
      return;
    }

    setRevokeError(null);
    setRevokeTxState('prompting');
    setIsRevoking(true);

    try {
      // 1. Kiểm tra ví và mạng trước khi ký
      await assertCorrectNetworkAndSigner(user?.walletAddress);

      // 2. Ký giao dịch thu hồi on-chain
      const tx = await revokeCertificateOnChain(certificateId);
      setRevokeTxHash(tx);
      setRevokeTxState('mining');

      // 3. Báo cho Backend cập nhật trạng thái
      await api.revokeCertificate(certificateId, tx);

      setRevokeTxState('success');
      toast.success('Đã thu hồi văn bằng thành công trên Blockchain!');

      // Tự động làm mới dữ liệu và đóng modal sau 1.5 giây
      setTimeout(() => {
        setIsRevokeModalOpen(false);
        setRevokeTxState('idle');
        setConfirmInput('');
        refetch();
      }, 1500);
    } catch (err: unknown) {
      const errorObj = err as { code?: number | string; message?: string };

      if (errorObj?.code === 4001 || errorObj?.message?.includes('user rejected')) {
        setRevokeTxState('rejected');
        setRevokeError('Bạn đã từ chối ký giao dịch thu hồi trên MetaMask.');
        toast.error('Giao dịch bị từ chối.');
      } else if (errorObj?.message?.includes('AlreadyRevoked')) {
        setRevokeTxState('reverted');
        setRevokeError('Văn bằng này đã được thu hồi trước đó trên Smart Contract.');
        toast.error('Văn bằng đã bị thu hồi trước đó.');
      } else {
        setRevokeTxState('error');
        setRevokeError(errorObj?.message || 'Có lỗi xảy ra khi thực hiện thu hồi văn bằng.');
        toast.error('Thu hồi văn bằng thất bại.');
      }
    } finally {
      setIsRevoking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 sm:py-16 flex-1 flex flex-col">
        <Container className="max-w-4xl space-y-6">
          <Skeleton className="h-6 w-32" />
          <div className="p-8 sm:p-12 rounded-3xl border border-[#E3D5B8] bg-[#FFFDF7] space-y-6">
            <div className="flex justify-between items-start">
              <Skeleton className="h-12 w-48" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
            <Skeleton className="h-6 w-64" />
            <div className="grid grid-cols-2 gap-4 pt-6">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (isError || !cert) {
    const is404 = error instanceof ApiRequestError && error.status === 404;

    return (
      <div className="py-16 flex-1 flex flex-col items-center justify-center">
        <Container className="max-w-md">
          <EmptyState
            icon={<AlertTriangle className="w-8 h-8 text-[#B23F4A]" />}
            title={is404 ? 'Không tìm thấy chứng chỉ' : 'Lỗi tải dữ liệu'}
            description={
              is404
                ? `Mã văn bằng "${certificateId}" không thuộc quyền quản lý của đơn vị hoặc không tồn tại.`
                : 'Đã có sự cố khi kết nối tới hệ thống máy chủ. Vui lòng thử lại sau.'
            }
            action={
              <Button variant="outline" size="sm" onClick={() => router.push('/issuer')}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                <span>Quay lại bảng điều khiển</span>
              </Button>
            }
          />
        </Container>
      </div>
    );
  }

  const typeLabel = CERTIFICATE_TYPE_LABELS[cert.certificateType] || cert.certificateType;

  return (
    <div className="py-8 sm:py-12 flex-1 flex flex-col">
      <Container className="max-w-4xl space-y-6">
        {/* Điều hướng quay lại */}
        <div className="flex items-center justify-between">
          <Link
            href="/issuer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6F5C4A] hover:text-[#010E1C] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Quay lại danh sách văn bằng</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link href={`/c/${encodeURIComponent(certificateId)}`} target="_blank">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <span>Xem trang công khai</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </Link>

            {/* Nút Thu hồi văn bằng */}
            {!isRevoked ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsRevokeModalOpen(true)}
                className="gap-1.5 text-xs h-8"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Thu hồi văn bằng</span>
              </Button>
            ) : (
              <span className="text-xs font-semibold text-[#B23F4A] bg-[#E6606A]/10 px-3 py-1 rounded-xl border border-[#E6606A]/30">
                Đã thu hồi hiệu lực
              </span>
            )}
          </div>
        </div>

        {/* Banner cảnh báo nếu đã bị thu hồi */}
        {isRevoked && (
          <div className="p-4 sm:p-5 rounded-2xl border-2 border-[#E6606A] bg-[#E6606A]/10 text-[#B23F4A] flex items-start gap-3.5 shadow-sm">
            <AlertOctagon className="w-6 h-6 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-serif font-bold text-base sm:text-lg uppercase tracking-wide">
                Văn bằng này đã bị thu hồi hiệu lực
              </h4>
              <p className="text-xs sm:text-sm text-[#B23F4A]/90 leading-relaxed">
                Đơn vị cấp đã thực hiện giao dịch thu hồi văn bằng này trên Blockchain vào ngày{' '}
                <strong>{formatDate(cert.revokedAt)}</strong>. Văn bằng không còn giá trị chứng nhận.
              </p>
              {cert.revokeTxHash && (
                <div className="pt-2 text-xs font-mono">
                  <span>Mã giao dịch thu hồi: </span>
                  <TxLink txHash={cert.revokeTxHash} shortenChars={12} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Khối thông tin chi tiết */}
        <div className="p-6 sm:p-10 rounded-3xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3D5B8]/80 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#6F5C4A] bg-[#FAF4DF] px-2.5 py-1 rounded-lg border border-[#E3D5B8]">
                  {cert.certificateId}
                </span>
                <StatusBadge status={cert.status} />
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#010E1C]">
                {cert.studentName}
              </h1>
              <p className="text-xs text-[#6F5C4A]">
                Mã số sinh viên: <strong className="font-mono text-[#010E1C]">{cert.studentCode}</strong>
              </p>
            </div>
          </div>

          {/* Chi tiết học thuật */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#FAF4DF]/60 border border-[#E3D5B8]/60 space-y-1">
              <span className="text-[#6F5C4A] block">Loại văn bằng:</span>
              <p className="font-bold text-sm text-[#010E1C]">{typeLabel}</p>
              {cert.major && <p className="text-[#6F5C4A]">Ngành: {cert.major}</p>}
            </div>

            <div className="p-4 rounded-xl bg-[#FAF4DF]/60 border border-[#E3D5B8]/60 space-y-1">
              <span className="text-[#6F5C4A] block">Kết quả tốt nghiệp:</span>
              <p className="text-[#010E1C]">
                Năm tốt nghiệp: <strong className="font-mono">{cert.graduationYear || '—'}</strong>
              </p>
              <p className="text-[#010E1C]">
                GPA: <strong className="font-mono">{cert.gpa !== null && cert.gpa !== undefined ? cert.gpa.toFixed(2) : '—'}</strong>{' '}
                {cert.classification && `(${cert.classification})`}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF4DF]/60 border border-[#E3D5B8]/60 space-y-1">
              <span className="text-[#6F5C4A] block">Ngày phát hành:</span>
              <p className="font-bold text-sm text-[#010E1C]">{formatDateOnly(cert.issuedAt)}</p>
              <p className="text-[11px] text-[#6F5C4A]">{formatDate(cert.issuedAt)}</p>
            </div>
          </div>

          {/* Thông tin Blockchain & IPFS */}
          <div className="pt-4 border-t border-[#E3D5B8]/60 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#010E1C]">
              Thông tin neo dữ liệu Blockchain & IPFS
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#FAF4DF] border border-[#E3D5B8]/60 space-y-1">
                <span className="text-[#6F5C4A] text-[11px] block">Giao dịch cấp bằng (Issue Tx):</span>
                {cert.txHash ? (
                  <TxLink txHash={cert.txHash} shortenChars={12} />
                ) : (
                  <span>—</span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[#FAF4DF] border border-[#E3D5B8]/60 space-y-1">
                <span className="text-[#6F5C4A] text-[11px] block">Tài liệu lưu trữ gốc:</span>
                <span className="text-[#010E1C] truncate block" title={cert.filename}>
                  {cert.filename || 'Văn bằng gốc.pdf'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Xác nhận thu hồi an toàn */}
        <Modal
          isOpen={isRevokeModalOpen}
          onClose={() => {
            if (!isRevoking) {
              setIsRevokeModalOpen(false);
              setRevokeTxState('idle');
            }
          }}
          title="Xác nhận thu hồi văn bằng"
          maxWidth="md"
        >
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl border border-[#E6606A] bg-[#E6606A]/10 text-xs text-[#B23F4A] flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <strong>HÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC!</strong>
                <p>
                  Một khi giao dịch thu hồi được xác nhận trên Blockchain Ethereum Sepolia, trạng thái của
                  văn bằng sẽ chuyển vĩnh viễn sang <strong>Đã thu hồi</strong>. Bất kỳ ai tra cứu hoặc
                  xác thực file này sẽ nhận được cảnh báo văn bằng vô hiệu lực.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-[#010E1C]">
              <p>
                Để xác nhận, vui lòng nhập chính xác mã văn bằng{' '}
                <strong className="font-mono text-[#B23F4A] select-all bg-[#FAF4DF] px-1.5 py-0.5 rounded border border-[#E3D5B8]">
                  {certificateId}
                </strong>{' '}
                vào ô bên dưới:
              </p>
              <Input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Nhập mã văn bằng để xác nhận..."
                className="font-mono"
                disabled={isRevoking}
              />
            </div>

            {/* Trạng thái ký transaction */}
            <TxStatus
              state={revokeTxState}
              txHash={revokeTxHash}
              errorMessage={revokeError}
            />

            {!isCorrectNetwork && (
              <div className="p-3 rounded-xl bg-[#E6606A]/10 text-xs text-[#B23F4A] flex items-center justify-between">
                <span>Cần chuyển sang mạng Sepolia để ký.</span>
                <Button variant="danger" size="sm" onClick={() => switchToSepolia()}>
                  Đổi mạng
                </Button>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E3D5B8]/60">
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsRevokeModalOpen(false)}
                disabled={isRevoking}
              >
                Hủy bỏ
              </Button>

              <Button
                variant="danger"
                size="md"
                isLoading={isRevoking}
                disabled={confirmInput.trim() !== certificateId || !isCorrectNetwork}
                onClick={handleConfirmRevoke}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xác nhận thu hồi on-chain</span>
              </Button>
            </div>
          </div>
        </Modal>
      </Container>
    </div>
  );
}

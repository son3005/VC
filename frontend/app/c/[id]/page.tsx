'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Container } from '@/components/layout/Container';
import { StatusBadge } from '@/components/certificate/StatusBadge';
import { PdfButton } from '@/components/certificate/PdfButton';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { api, ApiRequestError } from '@/lib/api';
import { formatDateOnly, shortenAddress } from '@/lib/format';
import { CERTIFICATE_TYPE_LABELS, EXPLORER_URL } from '@/lib/constants';
import {
  ShieldCheck,
  AlertTriangle,
  Award,
  Building,
  Check,
  ExternalLink,
  ChevronLeft,
  Share2,
  QrCode,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CertificateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const certificateId = decodeURIComponent((params.id as string) || '');

  const [currentUrl, setCurrentUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
  }, []);

  const {
    data: certData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['certificateDetail', certificateId],
    queryFn: () => api.certificateDetail(certificateId),
    enabled: !!certificateId,
    staleTime: 30 * 1000,
  });

  const cert = certData?.data;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success('Đã sao chép liên kết chứng chỉ!');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 sm:py-16 flex-1 flex flex-col">
        <Container className="max-w-4xl space-y-6">
          <Skeleton className="h-6 w-32" />
          <div className="p-8 sm:p-12 rounded-3xl border border-[#E3D5B8] bg-[#FFFDF7] space-y-6">
            <div className="flex justify-between items-start">
              <Skeleton className="h-16 w-16 rounded-2xl" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
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
                ? `Mã văn bằng "${certificateId}" không tồn tại trong hệ thống hoặc chưa được neo trên blockchain.`
                : 'Đã có sự cố khi kết nối tới hệ thống máy chủ. Vui lòng thử lại sau.'
            }
            action={
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => router.push('/search')}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  <span>Về trang tra cứu</span>
                </Button>
                {!is404 && (
                  <Button variant="primary" size="sm" onClick={() => refetch()}>
                    Thử lại
                  </Button>
                )}
              </div>
            }
          />
        </Container>
      </div>
    );
  }

  const isRevoked = cert.status === 'revoked';
  const typeLabel = CERTIFICATE_TYPE_LABELS[cert.certificateType] || cert.certificateType;

  return (
    <div className="py-8 sm:py-14 flex-1 flex flex-col">
      <Container className="max-w-4xl space-y-6">
        {/* Thanh điều hướng quay lại & Chia sẻ */}
        <div className="flex items-center justify-between">
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6F5C4A] hover:text-[#010E1C] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Quay lại trang tra cứu</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1.5 text-xs h-8"
              title="Sao chép link xác minh"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-[#E6AB42]" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>{copiedLink ? 'Đã sao chép' : 'Chia sẻ'}</span>
            </Button>

            {cert.ipfsCid && (
              <PdfButton cid={cert.ipfsCid} filename={cert.filename} size="sm" className="h-8" />
            )}
          </div>
        </div>

        {/* Banner cảnh báo ĐÃ THU HỒI */}
        {isRevoked && (
          <div className="p-4 sm:p-5 rounded-2xl border-2 border-[#E6606A] bg-[#E6606A]/10 text-[#B23F4A] flex items-start gap-3.5 shadow-sm">
            <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-serif font-bold text-base sm:text-lg uppercase tracking-wide">
                Cảnh báo: Chứng chỉ này đã bị thu hồi trên Blockchain!
              </h4>
              <p className="text-xs sm:text-sm text-[#B23F4A]/90 leading-relaxed">
                Đơn vị cấp phát văn bằng đã thực hiện giao dịch thu hồi tính hiệu lực của chứng chỉ này
                trên Smart Contract. Mọi văn bản liên quan không còn giá trị chứng nhận pháp lý.
              </p>
            </div>
          </div>
        )}

        {/* Card văn bằng chính (Academic Diploma Design) */}
        <div className="relative rounded-3xl border-2 border-[#E3D5B8] bg-[#FFFDF7] p-6 sm:p-12 shadow-md overflow-hidden">
          {/* Viền hoa văn học thuật góc card */}
          <div className="absolute top-0 left-0 w-24 h-24 border-t-4 border-l-4 border-[#E6AB42]/40 rounded-tl-3xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-24 h-24 border-t-4 border-r-4 border-[#E6AB42]/40 rounded-tr-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 border-b-4 border-l-4 border-[#E6AB42]/40 rounded-bl-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-24 h-24 border-b-4 border-r-4 border-[#E6AB42]/40 rounded-br-3xl pointer-events-none" />

          {/* Phần đầu: Logo trường & Huy hiệu trạng thái */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3D5B8]/80 pb-6 mb-8">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 relative flex items-center justify-center p-1 bg-[#FAF4DF] rounded-2xl border border-[#E3D5B8] shadow-2xs">
                <Image src="/logo.svg" alt="Emblem" width={44} height={44} priority />
              </div>
              <div>
                <p className="text-xs uppercase font-bold tracking-widest text-[#A48B73]">
                  Hồ sơ văn bằng chính thức
                </p>
                <h2 className="font-serif font-bold text-xl sm:text-2xl text-[#010E1C]">
                  {cert.issuerName || 'Trường Đại học'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:self-start">
              <StatusBadge status={cert.status} />
            </div>
          </div>

          {/* Nội dung trung tâm của văn bằng */}
          <div className="text-center space-y-4 max-w-2xl mx-auto py-2">
            <span className="font-mono text-xs font-bold text-[#6F5C4A] bg-[#FAF4DF] px-3 py-1 rounded-full border border-[#E3D5B8]">
              {cert.certificateId}
            </span>

            <p className="font-serif italic text-[#6F5C4A] text-sm">
              Chứng nhận văn bằng tốt nghiệp thuộc về
            </p>

            <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#010E1C] tracking-tight">
              {cert.studentName}
            </h1>

            <p className="text-sm text-[#6F5C4A]">
              Mã số sinh viên: <strong className="font-mono text-[#010E1C]">{cert.studentCode}</strong>
            </p>

            <div className="w-16 h-0.5 bg-[#E6AB42] mx-auto my-4" />

            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#010E1C] uppercase tracking-wider">
                {typeLabel} — {cert.major || 'Đào tạo chuẩn'}
              </p>
              {cert.details && typeof cert.details === 'object' && (
                <div className="text-xs text-[#6F5C4A] space-y-0.5">
                  {Boolean((cert.details as Record<string, unknown>).degreeTitle) && (
                    <p>Danh hiệu: {(cert.details as Record<string, unknown>).degreeTitle as string}</p>
                  )}
                  {Boolean((cert.details as Record<string, unknown>).studyMode) && (
                    <p>Hình thức đào tạo: {(cert.details as Record<string, unknown>).studyMode as string}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Lưới thông số học thuật & QR xác minh */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 mt-8 border-t border-[#E3D5B8]/80">
            {/* Cột 1: Điểm & Năm */}
            <div className="p-4 rounded-2xl bg-[#FAF4DF]/60 border border-[#E3D5B8]/60 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#010E1C]">
                <Award className="w-4 h-4 text-[#E6AB42]" />
                <span>Kết quả tốt nghiệp</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <p className="text-[#6F5C4A]">
                  Năm tốt nghiệp: <strong className="text-[#010E1C] font-mono">{cert.graduationYear || '—'}</strong>
                </p>
                <p className="text-[#6F5C4A]">
                  Điểm trung bình (GPA):{' '}
                  <strong className="text-[#010E1C] font-mono font-bold">
                    {cert.gpa !== null && cert.gpa !== undefined ? cert.gpa.toFixed(2) : '—'}
                  </strong>
                </p>
                <p className="text-[#6F5C4A]">
                  Xếp loại: <strong className="text-[#010E1C]">{cert.classification || '—'}</strong>
                </p>
              </div>
            </div>

            {/* Cột 2: Đơn vị cấp & Ngày */}
            <div className="p-4 rounded-2xl bg-[#FAF4DF]/60 border border-[#E3D5B8]/60 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#010E1C]">
                <Building className="w-4 h-4 text-[#E6AB42]" />
                <span>Phát hành & Bản mẫu</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <p className="text-[#6F5C4A]">
                  Đơn vị cấp: <strong className="text-[#010E1C]">{cert.issuerName}</strong>
                </p>
                <p className="text-[#6F5C4A]">
                  Ngày cấp: <strong className="text-[#010E1C]">{formatDateOnly(cert.issuedAt)}</strong>
                </p>
                <p className="text-[#6F5C4A]">
                  Template: <span className="font-mono text-[#010E1C]">{cert.templateId || 'degree-v1'} (v{cert.templateVersion || '1.0'})</span>
                </p>
              </div>
            </div>

            {/* Cột 3: QR Code xác minh tức thì */}
            <div className="p-4 rounded-2xl bg-[#FAF4DF]/60 border border-[#E3D5B8]/60 flex flex-col items-center justify-center text-center space-y-2">
              <div className="p-2 bg-white rounded-xl border border-[#E3D5B8] shadow-2xs">
                {currentUrl ? (
                  <QRCodeSVG
                    value={currentUrl}
                    size={84}
                    level="M"
                    fgColor="#010E1C"
                    bgColor="#FFFFFF"
                  />
                ) : (
                  <div className="w-[84px] h-[84px] bg-neutral-100 flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-neutral-400" />
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium text-[#6F5C4A] uppercase tracking-wide">
                Quét mã để xác minh
              </span>
            </div>
          </div>
        </div>

        {/* Khối chứng minh Blockchain Provenance */}
        <div className="p-6 sm:p-8 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] space-y-4">
          <div className="flex items-center justify-between border-b border-[#E3D5B8]/60 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#010E1C]">
              <ShieldCheck className="w-4 h-4 text-[#E6AB42]" />
              <span>Chứng minh mật mã trên Chuỗi khối Ethereum</span>
            </div>
            <span className="text-[11px] font-mono text-[#6F5C4A] bg-[#FAF4DF] px-2 py-0.5 rounded border border-[#E3D5B8]">
              Nguồn trạng thái: on-chain
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            {/* Giao dịch TxHash */}
            <div className="p-3 rounded-xl bg-[#FAF4DF] border border-[#E3D5B8]/60 space-y-1">
              <span className="text-[#6F5C4A] text-[11px]">Transaction Hash (Ethereum Sepolia):</span>
              <div className="flex items-center justify-between">
                <span className="text-[#010E1C] truncate" title={cert.txHash}>
                  {cert.txHash ? shortenAddress(cert.txHash, 10) : '—'}
                </span>
                {cert.txHash && (
                  <a
                    href={`${EXPLORER_URL}/tx/${cert.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-[#6F5C4A] hover:text-[#010E1C] rounded transition-colors"
                    title="Xem trên Sepolia Etherscan"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Block Number */}
            <div className="p-3 rounded-xl bg-[#FAF4DF] border border-[#E3D5B8]/60 space-y-1">
              <span className="text-[#6F5C4A] text-[11px]">Khối Blockchain (Block Number):</span>
              <div className="text-[#010E1C] font-bold">
                {cert.blockNumber ? `#${cert.blockNumber.toLocaleString()}` : '—'}
              </div>
            </div>

            {/* IPFS CID */}
            <div className="p-3 rounded-xl bg-[#FAF4DF] border border-[#E3D5B8]/60 space-y-1">
              <span className="text-[#6F5C4A] text-[11px]">Mã định danh IPFS (CID):</span>
              <div className="flex items-center justify-between">
                <span className="text-[#010E1C] truncate" title={cert.ipfsCid}>
                  {cert.ipfsCid ? shortenAddress(cert.ipfsCid, 10) : '—'}
                </span>
                {cert.ipfsCid && (
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${cert.ipfsCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-[#6F5C4A] hover:text-[#010E1C] rounded transition-colors"
                    title="Mở IPFS Gateway"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Kích thước & Loại tệp */}
            <div className="p-3 rounded-xl bg-[#FAF4DF] border border-[#E3D5B8]/60 space-y-1">
              <span className="text-[#6F5C4A] text-[11px]">Tài liệu gốc lưu trữ:</span>
              <div className="text-[#010E1C] truncate">
                {cert.filename || 'Văn bằng gốc.pdf'} ({cert.artifactType?.toUpperCase() || 'PDF'})
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

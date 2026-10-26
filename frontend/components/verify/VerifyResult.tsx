'use client';

import React from 'react';
import Link from 'next/link';
import type { VerifyHashResult } from '@/types/api';
import { StatusBadge } from '@/components/certificate/StatusBadge';
import { PdfButton } from '@/components/certificate/PdfButton';
import { CertificateDetails } from '@/components/certificate/CertificateDetails';
import { formatDateOnly, shortenAddress } from '@/lib/format';
import { CERTIFICATE_TYPE_LABELS, EXPLORER_URL } from '@/lib/constants';
import {
  ShieldCheck,
  AlertTriangle,
  Award,
  Building,
  ExternalLink,
  ArrowRight,
  FileX,
} from 'lucide-react';

export interface VerifyResultProps {
  result: VerifyHashResult;
  calculatedHash?: string;
}

export function VerifyResult({ result, calculatedHash }: VerifyResultProps) {
  const { exists, certificate, certificateId, issuer, issuedAt } = result;

  // Trường hợp 1: Không tìm thấy chứng chỉ khớp trên blockchain
  if (!exists || !certificate) {
    return (
      <div className="p-6 sm:p-8 rounded-2xl border border-[#E6606A]/40 bg-[#FFFDF7] space-y-4 shadow-sm animate-in fade-in">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-[#E6606A]/10 border border-[#E6606A]/30 flex items-center justify-center text-[#B23F4A] shrink-0">
            <FileX className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-xl font-bold text-[#B23F4A]">
                Không tìm thấy văn bằng trên Blockchain
              </h3>
              <StatusBadge status="not_found" size="sm" />
            </div>
            <p className="text-sm text-[#6F5C4A] leading-relaxed">
              Mã băm của tệp này không trùng khớp với bất kỳ chứng chỉ nào từng được cấp phát và lưu
              trên Smart Contract. Có thể tài liệu này đã bị can thiệp, chỉnh sửa nội dung, hoặc
              chưa từng được nhà trường phát hành chính thức.
            </p>
          </div>
        </div>

        {calculatedHash && (
          <div className="p-3.5 rounded-xl bg-[#FAF4DF] border border-[#E3D5B8] text-xs space-y-1">
            <span className="font-semibold text-[#010E1C]">Mã băm tệp bạn đã tải lên:</span>
            <p className="font-mono text-[11px] text-[#B23F4A] break-all">{calculatedHash}</p>
          </div>
        )}
      </div>
    );
  }

  // Trường hợp 2: Chứng chỉ tồn tại (Hợp lệ, tạm khoá hoặc đã thu hồi)
  const isRevoked = certificate.status === 'revoked';
  const isLocked = certificate.status === 'locked';
  const typeLabel =
    CERTIFICATE_TYPE_LABELS[certificate.certificateType] || certificate.certificateType;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Banner cảnh báo nếu đã bị thu hồi */}
      {isRevoked && (
        <div className="p-4 rounded-xl border border-[#E6606A] bg-[#E6606A]/10 text-sm text-[#B23F4A] flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <strong>CẢNH BÁO: VĂN BẰNG NÀY ĐÃ BỊ THU HỒI!</strong>
            <p className="text-xs text-[#B23F4A]/90 mt-0.5">
              Đơn vị cấp đã thu hồi văn bằng này trên Blockchain. Văn bằng hiện không còn giá trị sử dụng pháp lý.
            </p>
          </div>
        </div>
      )}

      {isLocked && (
        <div className="p-4 rounded-xl border border-[#E6AB42] bg-[#E6AB42]/10 text-sm text-[#8A6418] flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <strong>VĂN BẰNG ĐANG TẠM KHOÁ</strong>
            <p className="text-xs text-[#8A6418]/90 mt-0.5">
              Đơn vị cấp đã tạm khoá văn bằng này. Văn bằng chưa bị thu hồi vĩnh viễn và có thể được mở khoá.
            </p>
          </div>
        </div>
      )}

      {/* Thẻ chứng chỉ chi tiết */}
      <div className="p-6 sm:p-8 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-sm space-y-6">
        {/* Header thẻ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3D5B8]/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#6F5C4A] bg-[#FAF4DF] px-2.5 py-1 rounded-lg border border-[#E3D5B8]">
                {certificate.certificateId || certificateId}
              </span>
              <StatusBadge status={certificate.status} />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#010E1C]">
              {certificate.studentName}
            </h3>
            <p className="text-xs text-[#6F5C4A]">
              MSSV: <span className="font-mono font-semibold text-[#010E1C]">{certificate.studentCode}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {certificate.ipfsCid && (
              <PdfButton cid={certificate.ipfsCid} filename={certificate.filename} size="sm" />
            )}
            <Link href={`/c/${encodeURIComponent(certificate.certificateId)}`}>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#010E1C] text-[#E6AB42] hover:bg-black text-xs font-semibold shadow-2xs transition-all">
                <span>Xem hồ sơ gốc</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>

        {/* Thông tin học thuật & chi tiết theo loại */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-[#FAF4DF]/60 border border-[#E3D5B8]/60 lg:col-span-2 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-[#6F5C4A] border-b border-[#E3D5B8]/60 pb-1.5">
              <Award className="w-3.5 h-3.5 text-[#E6AB42]" />
              <span className="font-bold uppercase tracking-wider text-[#010E1C]">{typeLabel}</span>
            </div>
            <CertificateDetails
              type={certificate.certificateType}
              details={certificate.details as Record<string, unknown>}
              major={certificate.major}
              graduationYear={certificate.graduationYear}
              gpa={certificate.gpa}
              classification={certificate.classification}
              variant="compact"
            />
          </div>

          <div className="p-4 rounded-xl bg-[#FAF4DF]/60 border border-[#E3D5B8]/60 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-[#6F5C4A] border-b border-[#E3D5B8]/60 pb-1.5">
              <Building className="w-3.5 h-3.5 text-[#E6AB42]" />
              <span className="font-bold uppercase tracking-wider text-[#010E1C]">Đơn vị cấp phát</span>
            </div>
            <p className="font-semibold text-sm text-[#010E1C]">
              {certificate.issuerName || issuer || 'Trường Đại học'}
            </p>
            <p className="text-xs text-[#6F5C4A]">
              Ngày cấp: <strong className="text-[#010E1C]">{formatDateOnly(certificate.issuedAt || issuedAt)}</strong>
            </p>
          </div>
        </div>

        {/* Thông tin Blockchain Provenance */}
        <div className="pt-4 border-t border-[#E3D5B8]/60 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#010E1C]">
            <ShieldCheck className="w-4 h-4 text-[#E6AB42]" />
            <span>Xác thực mật mã trên Chuỗi khối Ethereum Sepolia</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2.5 rounded-lg bg-[#FAF4DF] border border-[#E3D5B8]/60 flex items-center justify-between gap-2">
              <span className="text-[#6F5C4A]">Mã giao dịch (Tx):</span>
              {certificate.txHash ? (
                <a
                  href={`${EXPLORER_URL}/tx/${certificate.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#010E1C] hover:text-[#E6AB42] underline flex items-center gap-1"
                >
                  {shortenAddress(certificate.txHash, 6)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span>—</span>
              )}
            </div>

            <div className="p-2.5 rounded-lg bg-[#FAF4DF] border border-[#E3D5B8]/60 flex items-center justify-between gap-2">
              <span className="text-[#6F5C4A]">Mã lưu trữ IPFS (CID):</span>
              <span className="text-[#010E1C]" title={certificate.ipfsCid}>
                {shortenAddress(certificate.ipfsCid, 6)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

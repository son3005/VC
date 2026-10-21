'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { CertificateSummary } from '@/types/api';
import { StatusBadge } from './StatusBadge';
import { CERTIFICATE_TYPE_LABELS } from '@/lib/constants';
import { formatDateOnly } from '@/lib/format';
import { ChevronRight, Award } from 'lucide-react';

export interface CertificateTableProps {
  certificates: CertificateSummary[];
  className?: string;
}

export function CertificateTable({ certificates, className }: CertificateTableProps) {
  const router = useRouter();

  return (
    <div className={`w-full overflow-hidden rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-xs ${className || ''}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-[#010E1C] border-collapse">
          <thead className="bg-[#FAF4DF] border-b border-[#E3D5B8] text-xs uppercase tracking-wider text-[#6F5C4A]">
            <tr>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Mã văn bằng / MSSV
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Họ và tên
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Loại / Ngành đào tạo
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold text-center">
                Năm TN
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold text-center">
                GPA / Xếp loại
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Ngày cấp
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold text-center">
                Trạng thái
              </th>
              <th scope="col" className="px-4 py-3.5 text-right">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3D5B8]/60">
            {certificates.map((cert) => {
              const typeLabel = CERTIFICATE_TYPE_LABELS[cert.certificateType] || cert.certificateType;

              return (
                <tr
                  key={cert.certificateId}
                  onClick={() => router.push(`/c/${encodeURIComponent(cert.certificateId)}`)}
                  className="hover:bg-[#FAF4DF]/60 cursor-pointer transition-colors group"
                >
                  {/* Mã / MSSV */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="font-mono text-xs font-bold text-[#010E1C]">
                      {cert.certificateId}
                    </div>
                    <div className="font-mono text-xs text-[#6F5C4A]">
                      MSSV: {cert.studentCode}
                    </div>
                  </td>

                  {/* Họ tên */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="font-serif font-bold text-sm text-[#010E1C] group-hover:text-[#E6AB42] transition-colors flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-[#E6AB42] shrink-0" />
                      <span>{cert.studentName}</span>
                    </div>
                  </td>

                  {/* Loại / Ngành */}
                  <td className="px-5 py-4">
                    <div className="text-xs font-semibold text-[#010E1C]">
                      {typeLabel}
                    </div>
                    <div className="text-xs text-[#6F5C4A] line-clamp-1">
                      {cert.major || '—'}
                    </div>
                  </td>

                  {/* Năm tốt nghiệp */}
                  <td className="px-5 py-4 whitespace-nowrap text-center font-mono text-xs">
                    {cert.graduationYear || '—'}
                  </td>

                  {/* GPA / Xếp loại */}
                  <td className="px-5 py-4 whitespace-nowrap text-center">
                    {cert.gpa !== null && cert.gpa !== undefined ? (
                      <div>
                        <span className="font-mono font-bold text-xs bg-[#FAF4DF] px-1.5 py-0.5 rounded border border-[#E3D5B8]">
                          {cert.gpa.toFixed(2)}
                        </span>
                        {cert.classification && (
                          <div className="text-[11px] text-[#6F5C4A] mt-0.5">
                            {cert.classification}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-[#6F5C4A]">—</span>
                    )}
                  </td>

                  {/* Ngày cấp */}
                  <td className="px-5 py-4 whitespace-nowrap text-xs text-[#6F5C4A]">
                    {formatDateOnly(cert.issuedAt)}
                  </td>

                  {/* Trạng thái on-chain */}
                  <td className="px-5 py-4 whitespace-nowrap text-center">
                    <StatusBadge status={cert.status} size="sm" />
                  </td>

                  {/* Mũi tên xem chi tiết */}
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <div className="w-7 h-7 rounded-lg bg-[#FAF4DF] border border-[#E3D5B8] flex items-center justify-center text-[#6F5C4A] group-hover:bg-[#010E1C] group-hover:text-[#E6AB42] group-hover:border-[#010E1C] transition-all ml-auto">
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
  );
}

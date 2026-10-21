'use client';

import React, { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { FileDropzone } from '@/components/verify/FileDropzone';
import { VerifyResult } from '@/components/verify/VerifyResult';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api, ApiRequestError } from '@/lib/api';
import type { VerifyHashResult, CertificateDetail } from '@/types/api';
import { ShieldCheck, FileCheck, Search, KeyRound, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VerifyPage() {
  const [activeTab, setActiveTab] = useState<'file' | 'code'>('file');

  // State cho Tab theo file
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [fileResult, setFileResult] = useState<VerifyHashResult | null>(null);
  const [isFileVerifying, setIsFileVerifying] = useState(false);

  // State cho Tab theo mã
  const [codeInput, setCodeInput] = useState('');
  const [codeResult, setCodeResult] = useState<VerifyHashResult | null>(null);
  const [isCodeVerifying, setIsCodeVerifying] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Xử lý khi chọn file và tính xong hash
  const handleFileSelect = async (hash: string) => {
    setFileHash(hash);
    setIsFileVerifying(true);
    setFileResult(null);

    try {
      const res = await api.verifyHash(hash);
      setFileResult(res.data);
      if (res.data.exists && res.data.valid) {
        toast.success('Xác thực thành công! Văn bằng hợp lệ trên blockchain.');
      } else if (res.data.exists && !res.data.valid) {
        toast.error('Văn bằng đã bị thu hồi trên blockchain!');
      } else {
        toast.error('Không tìm thấy văn bằng khớp với mã băm này.');
      }
    } catch {
      toast.error('Có lỗi xảy ra khi xác thực với máy chủ.');
      setFileResult({
        exists: false,
        valid: false,
        certificateId: null,
        issuer: null,
        issuedAt: null,
        certificate: null,
      });
    } finally {
      setIsFileVerifying(false);
    }
  };

  // Xử lý khi tìm kiếm theo mã
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = codeInput.trim();
    if (!trimmed) {
      setCodeError('Vui lòng nhập mã văn bằng.');
      return;
    }

    setCodeError(null);
    setIsCodeVerifying(true);
    setCodeResult(null);

    try {
      const res = await api.certificateDetail(trimmed);
      const cert: CertificateDetail = res.data;

      setCodeResult({
        exists: true,
        valid: cert.status === 'active',
        certificateId: cert.certificateId,
        issuer: cert.issuerName,
        issuedAt: cert.issuedAt,
        certificate: cert,
      });

      if (cert.status === 'active') {
        toast.success('Tìm thấy văn bằng hợp lệ!');
      } else {
        toast.error('Văn bằng này đã bị thu hồi!');
      }
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setCodeResult({
          exists: false,
          valid: false,
          certificateId: trimmed,
          issuer: null,
          issuedAt: null,
          certificate: null,
        });
        toast.error('Không tìm thấy văn bằng với mã này.');
      } else {
        toast.error('Có lỗi xảy ra khi tra cứu mã văn bằng.');
      }
    } finally {
      setIsCodeVerifying(false);
    }
  };

  return (
    <div className="py-10 sm:py-16 flex-1 flex flex-col">
      <Container className="max-w-4xl space-y-8">
        {/* Tiêu đề trang */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFDF7] border border-[#E3D5B8] text-xs font-semibold text-[#010E1C] shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-[#E6AB42]" />
            <span>Xác thực tính toàn vẹn văn bằng số</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#010E1C]">
            Kiểm tra tính thật - giả của chứng chỉ
          </h1>

          <p className="text-sm sm:text-base text-[#6F5C4A] max-w-xl mx-auto leading-relaxed">
            Hệ thống đối chiếu trực tiếp mã băm mật mã của file hoặc mã văn bằng với dữ liệu gốc
            được lưu trữ bất biến trên Blockchain.
          </p>
        </div>

        {/* Tab chuyển đổi */}
        <div className="flex justify-center">
          <div className="p-1.5 rounded-2xl bg-[#FFFDF7] border border-[#E3D5B8] flex flex-col sm:flex-row items-stretch sm:items-center gap-1 shadow-2xs w-full max-w-md sm:w-auto">
            <button
              onClick={() => setActiveTab('file')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'file'
                  ? 'bg-[#010E1C] text-[#E6AB42] shadow-xs'
                  : 'text-[#6F5C4A] hover:text-[#010E1C]'
              }`}
            >
              <FileCheck className="w-4 h-4 shrink-0" />
              <span>Xác thực bằng file</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'code'
                  ? 'bg-[#010E1C] text-[#E6AB42] shadow-xs'
                  : 'text-[#6F5C4A] hover:text-[#010E1C]'
              }`}
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>Tra cứu theo mã</span>
            </button>
          </div>
        </div>

        {/* Nội dung Tab 1: Xác thực bằng file */}
        {activeTab === 'file' && (
          <div className="space-y-6">
            <FileDropzone
              onFileSelect={handleFileSelect}
              isVerifying={isFileVerifying}
            />

            {isFileVerifying && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#6F5C4A]">
                <Loader2 className="w-5 h-5 animate-spin text-[#E6AB42]" />
                <span>Đang kết nối smart contract để đối chiếu mã băm...</span>
              </div>
            )}

            {fileResult && !isFileVerifying && (
              <VerifyResult result={fileResult} calculatedHash={fileHash || undefined} />
            )}
          </div>
        )}

        {/* Nội dung Tab 2: Tra cứu theo mã */}
        {activeTab === 'code' && (
          <div className="space-y-6">
            <form
              onSubmit={handleCodeSubmit}
              className="p-6 sm:p-8 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-2xs space-y-4"
            >
              <h3 className="font-serif font-bold text-lg text-[#010E1C]">
                Nhập mã định danh văn bằng
              </h3>
              <p className="text-xs text-[#6F5C4A]">
                Mã văn bằng được in ở góc dưới hoặc mã QR trên chứng chỉ (Ví dụ: <code className="font-mono text-[#010E1C]">UIT-DEG-2026-0001</code>).
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <div className="flex-1">
                  <Input
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="Nhập mã văn bằng..."
                    className="py-3 font-mono"
                    error={codeError || undefined}
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isCodeVerifying}
                  className="gap-2 sm:self-start h-11 px-6"
                >
                  <Search className="w-4 h-4" />
                  <span>Xác thực mã</span>
                </Button>
              </div>
            </form>

            {isCodeVerifying && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#6F5C4A]">
                <Loader2 className="w-5 h-5 animate-spin text-[#E6AB42]" />
                <span>Đang truy xuất thông tin từ blockchain...</span>
              </div>
            )}

            {codeResult && !isCodeVerifying && (
              <VerifyResult result={codeResult} />
            )}
          </div>
        )}
      </Container>
    </div>
  );
}

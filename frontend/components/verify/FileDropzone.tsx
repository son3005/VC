'use client';

import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface FileDropzoneProps {
  onFileSelect: (hash: string, file: File) => void;
  isVerifying?: boolean;
  className?: string;
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

export function FileDropzone({ onFileSelect, isVerifying = false, className }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [isHashing, setIsHashing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `sha256:${hex}`;
  };

  const processFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);

      // Validate kích thước
      if (file.size > MAX_SIZE_BYTES) {
        setErrorMessage('Dung lượng tệp vượt quá giới hạn cho phép (tối đa 5MB).');
        setSelectedFile(null);
        setFileHash(null);
        return;
      }

      // Validate loại tệp
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setErrorMessage('Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp PDF, PNG, hoặc JPG.');
        setSelectedFile(null);
        setFileHash(null);
        return;
      }

      setSelectedFile(file);
      setIsHashing(true);

      try {
        const hash = await calculateHash(file);
        setFileHash(hash);
        onFileSelect(hash, file);
      } catch {
        setErrorMessage('Không thể tính toán mã băm mật mã của tệp. Vui lòng thử lại.');
      } finally {
        setIsHashing(false);
      }
    },
    [onFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  return (
    <div className={cn('w-full space-y-3', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 select-none text-center',
          isDragging
            ? 'border-[#E6AB42] bg-[#FAF4DF]'
            : 'border-[#E3D5B8] bg-[#FFFDF7] hover:border-[#A48B73] hover:bg-[#FAF4DF]/40',
          errorMessage && 'border-[#B23F4A]/60 bg-[#E6606A]/5'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="w-14 h-14 rounded-full bg-[#FAF4DF] border border-[#E3D5B8] flex items-center justify-center text-[#E6AB42] mb-4 shadow-2xs">
          {isHashing || isVerifying ? (
            <Loader2 className="w-7 h-7 animate-spin text-[#E6AB42]" />
          ) : selectedFile ? (
            <CheckCircle2 className="w-7 h-7 text-[#E6AB42]" />
          ) : (
            <UploadCloud className="w-7 h-7 text-[#010E1C]" />
          )}
        </div>

        <div className="space-y-1.5 max-w-md">
          <h4 className="font-serif font-bold text-base sm:text-lg text-[#010E1C]">
            {isHashing
              ? 'Đang tính toán mã băm SHA-256...'
              : isVerifying
              ? 'Đang kiểm tra chữ ký trên blockchain...'
              : selectedFile
              ? selectedFile.name
              : 'Kéo thả file chứng chỉ vào đây'}
          </h4>

          <p className="text-xs sm:text-sm text-[#6F5C4A]">
            {selectedFile ? (
              <span>Dung lượng: {formatBytes(selectedFile.size)}</span>
            ) : (
              <span>
                Hỗ trợ tệp <strong>PDF</strong>, <strong>PNG</strong>, <strong>JPG</strong> (dung lượng tối đa 5MB)
              </span>
            )}
          </p>
        </div>

        {!selectedFile && (
          <div className="mt-4 px-4 py-1.5 rounded-xl bg-[#FAF4DF] border border-[#E3D5B8] text-xs font-semibold text-[#010E1C]">
            Hoặc bấm để chọn file từ máy tính
          </div>
        )}
      </div>

      {/* Hiển thị mã băm đã tính client-side */}
      {fileHash && (
        <div className="p-3.5 rounded-xl bg-[#FFFDF7] border border-[#E3D5B8] text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-[#010E1C]">
            <FileText className="w-3.5 h-3.5 text-[#E6AB42]" />
            <span>Mã băm mật mã SHA-256 (tính toán an toàn trực tiếp trên trình duyệt):</span>
          </div>
          <p className="font-mono text-[11px] text-[#6F5C4A] break-all bg-[#FAF4DF] p-2 rounded-lg border border-[#E3D5B8]/60">
            {fileHash}
          </p>
        </div>
      )}

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-[#E6606A]/10 border border-[#E6606A]/30 text-xs text-[#B23F4A] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}

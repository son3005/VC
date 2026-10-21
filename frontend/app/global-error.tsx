'use client';

import React from 'react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col items-center justify-center bg-[#FAF4DF] text-[#010E1C] p-6 font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#FFFDF7] border-2 border-[#E3D5B8] text-center space-y-6 shadow-md">
          <div className="w-16 h-16 rounded-2xl bg-[#E6606A]/15 flex items-center justify-center mx-auto text-[#B23F4A] font-bold text-2xl font-serif">
            !
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-bold text-[#010E1C]">
              Lỗi hệ thống nghiêm trọng
            </h1>
            <p className="text-sm text-[#6F5C4A] leading-relaxed">
              Trang web gặp sự cố không thể khôi phục tự động. Vui lòng bấm làm mới ứng dụng.
            </p>
          </div>

          <button
            onClick={() => reset()}
            className="w-full py-3 px-4 rounded-xl bg-[#010E1C] text-[#FAF4DF] hover:bg-[#010E1C]/90 font-medium text-sm transition-colors"
          >
            Tải lại ứng dụng
          </button>
        </div>
      </body>
    </html>
  );
}

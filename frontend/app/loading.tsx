import React from 'react';
import { Container } from '@/components/layout/Container';

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 bg-[#FAF4DF]">
      <Container className="max-w-md text-center space-y-4">
        <div className="relative w-12 h-12 mx-auto">
          <div className="w-12 h-12 rounded-full border-3 border-[#E3D5B8] border-t-[#E6AB42] animate-spin" />
        </div>
        <p className="text-xs uppercase font-medium tracking-widest text-[#6F5C4A] animate-pulse">
          Đang tải dữ liệu từ Blockchain...
        </p>
      </Container>
    </div>
  );
}

'use client';

import React, { useSyncExternalStore } from 'react';
import Image from 'next/image';
import {
  getLoadingServerSnapshot,
  getLoadingSnapshot,
  subscribeLoading,
} from '@/lib/loading-store';
import { SCHOOL_NAME } from '@/lib/constants';

export function GlobalLoading() {
  const { visible, message } = useSyncExternalStore(
    subscribeLoading,
    getLoadingSnapshot,
    getLoadingServerSnapshot
  );

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#010E1C]/35 backdrop-blur-[2px] px-4"
    >
      <div className="w-full max-w-xs rounded-3xl border border-[#E3D5B8] bg-[#FFFDF7] px-7 py-8 text-center shadow-2xl">
        <div className="relative w-20 h-20 mx-auto mb-5">
          <span className="absolute inset-0 rounded-full border-2 border-[#E6AB42]/25" />
          <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#E6AB42] border-r-[#E6AB42] animate-spin" />
          <div className="absolute inset-2 rounded-full bg-[#FAF4DF] border border-[#E3D5B8] flex items-center justify-center">
            <Image src="/logo.png" alt={`${SCHOOL_NAME} logo`} width={48} height={48} priority />
          </div>
        </div>

        <p className="font-serif text-lg font-bold text-[#010E1C]">{SCHOOL_NAME}</p>
        <p className="mt-2 text-sm text-[#6F5C4A]">{message}</p>
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-[#E3D5B8]/60">
          <div className="h-full w-1/2 rounded-full bg-[#E6AB42] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

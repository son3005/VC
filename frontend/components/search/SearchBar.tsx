'use client';

import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  size?: 'normal' | 'large';
  className?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Tìm theo Mã văn bằng (VD: UIT-DEG-2026-0001), Họ tên, hoặc MSSV...',
  size = 'normal',
  className,
  autoFocus = false,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Phím tắt: '/' để focus, 'Esc' để xóa nội dung
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        // Chỉ bắt phím '/' nếu người dùng không đang nhập ở input/textarea khác
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      } else if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        onChange('');
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(value);
    }
  };

  const isLarge = size === 'large';

  return (
    <form onSubmit={handleSubmit} className={cn('relative w-full', className)}>
      <div className="relative flex items-center">
        <div
          className={cn(
            'absolute left-4 text-[#6F5C4A] pointer-events-none flex items-center justify-center',
            isLarge ? 'left-5' : 'left-3.5'
          )}
        >
          <Search className={cn(isLarge ? 'w-5 h-5 text-[#E6AB42]' : 'w-4 h-4 text-[#6F5C4A]')} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            'w-full rounded-2xl bg-[#FFFDF7] border text-[#010E1C] placeholder:text-[#6F5C4A]/60 transition-all outline-none shadow-sm',
            'border-[#E3D5B8] focus:border-[#E6AB42] focus:ring-4 focus:ring-[#E6AB42]/20',
            isLarge
              ? 'py-4 pl-14 pr-24 text-base md:text-lg'
              : 'py-2.5 pl-10 pr-20 text-sm'
          )}
        />

        <div className="absolute right-3.5 flex items-center gap-1.5">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-[#6F5C4A] hover:text-[#010E1C] hover:bg-[#FAF4DF] transition-colors"
              title="Xóa nội dung (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Phím tắt badge */}
          <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FAF4DF] border border-[#E3D5B8] text-[10px] font-mono text-[#6F5C4A] select-none">
            <span>/</span>
          </div>
        </div>
      </div>
    </form>
  );
}

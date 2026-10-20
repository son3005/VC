'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-[#010E1C] tracking-wide uppercase">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-[#6F5C4A] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full rounded-xl bg-[#FFFDF7] border text-[#010E1C] placeholder:text-[#6F5C4A]/60 px-3.5 py-2.5 text-sm transition-all outline-none',
              'border-[#E3D5B8] focus:border-[#E6AB42] focus:ring-2 focus:ring-[#E6AB42]/30',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-[#B23F4A] focus:border-[#B23F4A] focus:ring-[#B23F4A]/20',
              'disabled:bg-[#FAF4DF] disabled:opacity-60 disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-[#6F5C4A] flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-[#B23F4A] font-medium mt-0.5">{error}</p>}
        {!error && helperText && <p className="text-xs text-[#6F5C4A] mt-0.5">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

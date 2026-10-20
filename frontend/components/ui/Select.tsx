'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, placeholder, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-[#010E1C] tracking-wide uppercase">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'w-full appearance-none rounded-xl bg-[#FFFDF7] border text-[#010E1C] px-3.5 py-2.5 pr-10 text-sm transition-all outline-none cursor-pointer',
              'border-[#E3D5B8] focus:border-[#E6AB42] focus:ring-2 focus:ring-[#E6AB42]/30',
              error && 'border-[#B23F4A] focus:border-[#B23F4A]',
              'disabled:bg-[#FAF4DF] disabled:opacity-60 disabled:cursor-not-allowed',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3.5 w-4 h-4 text-[#6F5C4A] pointer-events-none" />
        </div>
        {error && <p className="text-xs text-[#B23F4A] font-medium mt-0.5">{error}</p>}
        {!error && helperText && <p className="text-xs text-[#6F5C4A] mt-0.5">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

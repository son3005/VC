'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E6AB42] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-xl active:scale-[0.98]';

    const variants = {
      primary: 'bg-[#010E1C] text-[#E6AB42] hover:bg-black/90 shadow-sm',
      secondary: 'bg-[#E6AB42] text-[#010E1C] hover:bg-[#d99f35] shadow-sm',
      outline: 'border border-[#E3D5B8] bg-[#FFFDF7] text-[#010E1C] hover:border-[#A48B73] hover:bg-[#FAF4DF]',
      ghost: 'bg-transparent text-[#010E1C] hover:bg-[#E3D5B8]/30',
      danger: 'bg-[#B23F4A] text-white hover:bg-[#9b313b] shadow-sm',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-4 py-2 gap-2 h-10',
      lg: 'text-base px-6 py-3 gap-2.5 h-12',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

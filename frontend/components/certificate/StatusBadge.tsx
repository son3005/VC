import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertOctagon, HelpCircle, Loader2, Lock } from 'lucide-react';

export type StatusType = 'active' | 'revoked' | 'locked' | 'not_found' | 'loading';

export interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, className, size = 'md' }: StatusBadgeProps) {
  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5 gap-1',
    md: 'text-xs px-3.5 py-1.5 gap-1.5',
  };

  const statusConfigs = {
    active: {
      label: 'Hợp lệ',
      style: 'bg-[#010E1C] text-[#E6AB42] border border-[#E6AB42]/30',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#E6AB42]" />,
    },
    revoked: {
      label: 'Đã thu hồi',
      style: 'bg-[#E6606A]/15 text-[#B23F4A] border border-[#E6606A]/30',
      icon: <AlertOctagon className="w-3.5 h-3.5 text-[#B23F4A]" />,
    },
    locked: {
      label: 'Tạm khoá',
      style: 'bg-[#E6AB42]/15 text-[#8A6418] border border-[#E6AB42]/40',
      icon: <Lock className="w-3.5 h-3.5 text-[#8A6418]" />,
    },
    not_found: {
      label: 'Không tồn tại',
      style: 'bg-[#A48B73]/20 text-[#6F5C4A] border border-[#A48B73]/30',
      icon: <HelpCircle className="w-3.5 h-3.5 text-[#6F5C4A]" />,
    },
    loading: {
      label: 'Đang kiểm tra...',
      style: 'bg-[#FAF4DF] text-[#6F5C4A] border border-[#E3D5B8]',
      icon: <Loader2 className="w-3.5 h-3.5 text-[#E6AB42] animate-spin" />,
    },
  };

  const config = statusConfigs[status] || statusConfigs.not_found;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full tracking-wide uppercase shadow-2xs select-none',
        sizeStyles[size],
        config.style,
        className
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}

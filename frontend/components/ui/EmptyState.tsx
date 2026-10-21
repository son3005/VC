import React from 'react';
import { FileQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-[#E3D5B8] bg-[#FFFDF7]/60 my-4',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[#FAF4DF] text-[#A48B73] flex items-center justify-center mb-3">
        {icon || <FileQuestion className="w-6 h-6" />}
      </div>
      <h4 className="font-serif text-lg font-semibold text-[#010E1C] mb-1">
        {title}
      </h4>
      {description && (
        <p className="text-sm text-[#6F5C4A] max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

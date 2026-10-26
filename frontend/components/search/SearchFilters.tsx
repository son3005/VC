'use client';

import React from 'react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { CERTIFICATE_TYPE_LABELS } from '@/lib/constants';
import { Filter, RotateCcw } from 'lucide-react';

export interface FilterState {
  year?: string;
  major?: string;
  type?: string;
  status?: string;
}

export interface SearchFiltersProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  onReset: () => void;
  availableYears?: number[];
  availableMajors?: string[];
  totalResults?: number;
}

export function SearchFilters({
  filters,
  onChange,
  onReset,
  availableYears = [],
  availableMajors = [],
  totalResults,
}: SearchFiltersProps) {
  const hasActiveFilters =
    Boolean(filters.year) ||
    Boolean(filters.major) ||
    Boolean(filters.type) ||
    (Boolean(filters.status) && filters.status !== 'all');

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Hợp lệ' },
    { value: 'revoked', label: 'Đã thu hồi' },
    { value: 'locked', label: 'Tạm khoá' },
  ];

  const typeOptions = [
    { value: '', label: 'Tất cả loại văn bằng' },
    ...Object.entries(CERTIFICATE_TYPE_LABELS).map(([val, label]) => ({
      value: val,
      label,
    })),
  ];

  const yearOptions = [
    { value: '', label: 'Tất cả các năm' },
    ...availableYears.map((y) => ({
      value: y.toString(),
      label: `Năm ${y}`,
    })),
  ];

  const majorOptions = [
    { value: '', label: 'Tất cả các ngành' },
    ...availableMajors.map((m) => ({
      value: m,
      label: m,
    })),
  ];

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-2xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#E3D5B8]/60 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#010E1C]">
          <Filter className="w-3.5 h-3.5 text-[#E6AB42]" />
          <span>Bộ lọc nâng cao</span>
          {totalResults !== undefined && (
            <span className="text-[11px] font-normal text-[#6F5C4A] normal-case">
              ({totalResults} kết quả)
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-[#B23F4A] hover:bg-[#E6606A]/10 h-7 px-2 gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Đặt lại bộ lọc</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Lọc loại văn bằng */}
        <Select
          value={filters.type || ''}
          onChange={(e) => onChange({ ...filters, type: e.target.value })}
          options={typeOptions}
        />

        {/* Lọc ngành học */}
        <Select
          value={filters.major || ''}
          onChange={(e) => onChange({ ...filters, major: e.target.value })}
          options={majorOptions}
        />

        {/* Lọc năm */}
        <Select
          value={filters.year || ''}
          onChange={(e) => onChange({ ...filters, year: e.target.value })}
          options={yearOptions}
        />

        {/* Lọc trạng thái */}
        <Select
          value={filters.status || 'all'}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          options={statusOptions}
        />
      </div>
    </div>
  );
}

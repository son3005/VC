'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Container } from '@/components/layout/Container';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchFilters, type FilterState } from '@/components/search/SearchFilters';
import { CertificateTable } from '@/components/certificate/CertificateTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';
import { Search, ChevronLeft, ChevronRight, FileX2, Loader2, Sparkles } from 'lucide-react';

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Đọc params từ URL
  const initialQuery = searchParams.get('q') || '';
  const initialYear = searchParams.get('year') || '';
  const initialMajor = searchParams.get('major') || '';
  const initialType = searchParams.get('type') || '';
  const initialStatus = searchParams.get('status') || 'all';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [queryInput, setQueryInput] = useState(initialQuery);
  const debouncedQuery = useDebounce(queryInput, 400);

  const [filters, setFilters] = useState<FilterState>({
    year: initialYear,
    major: initialMajor,
    type: initialType,
    status: initialStatus,
  });

  const [currentPage, setCurrentPage] = useState(initialPage);

  // Lấy danh sách filters có sẵn từ server
  const { data: filterOptionsData } = useQuery({
    queryKey: ['filterOptions'],
    queryFn: () => api.filters(),
    staleTime: 5 * 60 * 1000,
  });

  // Đồng bộ state lên URL query
  const syncUrlParams = useCallback(
    (q: string, flt: FilterState, page: number) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (flt.year) params.set('year', flt.year);
      if (flt.major) params.set('major', flt.major);
      if (flt.type) params.set('type', flt.type);
      if (flt.status && flt.status !== 'all') params.set('status', flt.status);
      if (page > 1) params.set('page', page.toString());

      const newUrl = params.toString() ? `/search?${params.toString()}` : '/search';
      router.replace(newUrl, { scroll: false });
    },
    [router]
  );

  // Đồng bộ state khi URL searchParams thay đổi từ bên ngoài (Back/Forward hoặc điều hướng link mới)
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const year = searchParams.get('year') || '';
    const major = searchParams.get('major') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);

    setQueryInput((prev) => (prev !== q ? q : prev));
    setFilters((prev) => {
      if (
        prev.year !== year ||
        prev.major !== major ||
        prev.type !== type ||
        prev.status !== status
      ) {
        return { year, major, type, status };
      }
      return prev;
    });
    setCurrentPage((prev) => (prev !== page ? page : prev));
  }, [searchParams]);

  // Khi debouncedQuery hoặc filters thay đổi → sync URL
  useEffect(() => {
    syncUrlParams(debouncedQuery, filters, currentPage);
  }, [debouncedQuery, filters, currentPage, syncUrlParams]);

  // Query gọi API tìm kiếm
  const queryParams = new URLSearchParams();
  if (debouncedQuery.trim()) queryParams.set('q', debouncedQuery.trim());
  if (filters.year) queryParams.set('year', filters.year);
  if (filters.major) queryParams.set('major', filters.major);
  if (filters.type) queryParams.set('type', filters.type);
  if (filters.status && filters.status !== 'all') queryParams.set('status', filters.status);
  queryParams.set('page', currentPage.toString());
  queryParams.set('limit', '20');

  const {
    data: searchData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['searchCertificates', queryParams.toString()],
    queryFn: () => api.searchCertificates(queryParams),
    staleTime: 10 * 1000,
  });

  const certificates = searchData?.data || [];
  const meta = searchData?.meta;
  const totalPages = meta?.totalPages || 1;
  const totalResults = meta?.total || certificates.length;

  const handleResetFilters = () => {
    setQueryInput('');
    setFilters({
      year: '',
      major: '',
      type: '',
      status: 'all',
    });
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasAnyFilter =
    Boolean(debouncedQuery) ||
    Boolean(filters.year) ||
    Boolean(filters.major) ||
    Boolean(filters.type) ||
    (Boolean(filters.status) && filters.status !== 'all');

  return (
    <div className="py-8 sm:py-12 flex-1 flex flex-col">
      <Container className="space-y-6">
        {/* Header tìm kiếm */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A48B73]">
            <Search className="w-3.5 h-3.5 text-[#E6AB42]" />
            <span>Cổng tra cứu công khai</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#010E1C]">
            Tra cứu văn bằng & chứng chỉ
          </h1>
          <p className="text-sm text-[#6F5C4A] max-w-2xl leading-relaxed">
            Nhập mã văn bằng, họ tên người học, hoặc mã số sinh viên để xác thực trực tiếp
            tính hợp lệ từ blockchain.
          </p>
        </div>

        {/* Thanh tìm kiếm chính */}
        <div className="sticky top-20 z-20 py-2 bg-[#FAF4DF]/90 backdrop-blur-md">
          <SearchBar
            value={queryInput}
            onChange={(val) => {
              setQueryInput(val);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo Mã văn bằng (UIT-DEG-...), Họ tên, hoặc MSSV..."
            size="large"
            autoFocus
          />
        </div>

        {/* Bộ lọc nâng cao */}
        <SearchFilters
          filters={filters}
          onChange={(newFilters) => {
            setFilters(newFilters);
            setCurrentPage(1);
          }}
          onReset={handleResetFilters}
          availableYears={filterOptionsData?.data?.years || []}
          availableMajors={filterOptionsData?.data?.majors || []}
          totalResults={totalResults}
        />

        {/* Trạng thái tải / Kết quả */}
        {isLoading ? (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center gap-2 text-sm text-[#6F5C4A]">
              <Loader2 className="w-5 h-5 text-[#E6AB42] animate-spin" />
              <span>Đang tra cứu dữ liệu từ blockchain...</span>
            </div>
            <div className="p-6 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ) : isError ? (
          <EmptyState
            icon={<FileX2 className="w-8 h-8 text-[#B23F4A]" />}
            title="Không thể tải dữ liệu"
            description="Có lỗi xảy ra khi kết nối tới hệ thống máy chủ hoặc blockchain. Vui lòng thử lại."
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Thử lại
              </Button>
            }
          />
        ) : certificates.length === 0 ? (
          <EmptyState
            icon={<Search className="w-8 h-8 text-[#A48B73]" />}
            title={hasAnyFilter ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có chứng chỉ nào'}
            description={
              hasAnyFilter
                ? 'Không có văn bằng nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại. Bạn vui lòng thử lại với từ khóa khác.'
                : 'Hệ thống hiện chưa có văn bằng nào được lưu trữ.'
            }
            action={
              hasAnyFilter ? (
                <Button variant="primary" size="sm" onClick={handleResetFilters}>
                  Xóa tất cả bộ lọc
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#6F5C4A]">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E6AB42]" />
                <span>
                  Tìm thấy <strong className="text-[#010E1C]">{totalResults}</strong> văn bằng
                </span>
                {isFetching && (
                  <span className="text-[11px] text-[#A48B73] italic">
                    (Đang cập nhật...)
                  </span>
                )}
              </div>
            </div>

            {/* Bảng kết quả */}
            <CertificateTable certificates={certificates} />

            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-[#E3D5B8]/60">
                <p className="text-xs text-[#6F5C4A]">
                  Trang <span className="font-semibold text-[#010E1C]">{currentPage}</span> /{' '}
                  <span className="font-semibold text-[#010E1C]">{totalPages}</span>
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Trang trước</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="gap-1"
                  >
                    <span>Trang sau</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Container>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <Container className="py-16 text-center text-sm text-[#6F5C4A]">
          <Loader2 className="w-6 h-6 animate-spin text-[#E6AB42] mx-auto mb-2" />
          <span>Đang tải trang tìm kiếm...</span>
        </Container>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}

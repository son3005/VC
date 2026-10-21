import React from 'react';

export interface CertificateDetailsProps {
  type: string;
  details?: Record<string, unknown> | null;
  // Fallbacks từ cấp trên của CertificateDTO
  major?: string | null;
  graduationYear?: number | null;
  gpa?: number | null;
  classification?: string | null;
  className?: string;
  variant?: 'diploma' | 'card' | 'compact';
}

export function CertificateDetails({
  type,
  details = {},
  major,
  graduationYear,
  gpa,
  classification,
  className = '',
  variant = 'diploma',
}: CertificateDetailsProps) {
  const d = details || {};
  const isCompact = variant === 'compact';

  // 1. DIPLOMA / BẰNG TỐT NGHIỆP (DEGREE)
  if (type === 'degree') {
    const finalMajor = (d.major as string) || major || 'Chưa cập nhật';
    const finalYear = (d.graduationYear as number) || graduationYear || null;
    const finalGpa = (d.gpa as number) !== undefined ? (d.gpa as number) : gpa !== null ? gpa : null;
    const finalClass = (d.classification as string) || classification || null;
    const degreeTitle = (d.degreeTitle as string) || 'Cử nhân';
    const studyMode = (d.studyMode as string) || null;
    const thesisTitle = (d.thesisTitle as string) || null;

    if (isCompact) {
      return (
        <div className={`space-y-1.5 text-xs ${className}`}>
          <div className="flex items-center justify-between">
            <span className="text-[#6F5C4A]">Danh hiệu / Ngành:</span>
            <strong className="text-[#010E1C] font-semibold">{degreeTitle} — {finalMajor}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6F5C4A]">Năm tốt nghiệp / Xếp loại:</span>
            <span className="text-[#010E1C]">
              {finalYear || '—'} • <strong>{finalClass || '—'}</strong>
            </span>
          </div>
          {finalGpa !== null && finalGpa !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-[#6F5C4A]">Điểm trung bình (GPA):</span>
              <span className="font-mono font-bold text-[#010E1C]">{Number(finalGpa).toFixed(2)} / 4.0</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`space-y-4 ${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#FAF4DF]/60 border border-[#E3D5B8]/60 space-y-1">
            <span className="text-[11px] text-[#6F5C4A] block">Danh hiệu & Ngành đào tạo</span>
            <div className="font-serif font-bold text-sm text-[#010E1C]">
              {degreeTitle} — {finalMajor}
            </div>
            {studyMode && (
              <span className="text-[11px] text-[#A48B73] block">Hình thức: {studyMode}</span>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF4DF]/60 border border-[#E3D5B8]/60 space-y-1">
            <span className="text-[11px] text-[#6F5C4A] block">Kết quả học tập</span>
            <div className="font-serif font-bold text-sm text-[#010E1C]">
              Xếp loại: {finalClass || 'Khá'}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#6F5C4A]">
              <span>Năm TN: <strong className="font-mono text-[#010E1C]">{finalYear || '—'}</strong></span>
              {finalGpa !== null && (
                <span>GPA: <strong className="font-mono text-[#010E1C]">{Number(finalGpa).toFixed(2)}</strong></span>
              )}
            </div>
          </div>
        </div>

        {thesisTitle && (
          <div className="p-3 rounded-xl bg-[#FAF4DF]/40 border border-[#E3D5B8]/40 text-xs">
            <span className="text-[#6F5C4A] block mb-0.5 font-medium">Khóa luận tốt nghiệp:</span>
            <p className="font-serif italic text-[#010E1C]">{thesisTitle}</p>
          </div>
        )}
      </div>
    );
  }

  // 2. KHÓA HỌC / CHỨNG CHỈ HỌC PHẦN (COURSE)
  if (type === 'course') {
    const courseCode = (d.courseCode as string) || 'CS409';
    const courseName = (d.courseName as string) || (d.title as string) || 'Khóa học chuyên môn';
    const credits = (d.credits as number) || 3;
    const semester = (d.semester as string) || '';
    const grade = d.grade !== undefined ? d.grade : 'A';
    const gradeScale = (d.gradeScale as string) || '10';
    const grade4 = d.grade4 !== undefined && d.grade4 !== null ? Number(d.grade4) : null;
    const durationHours = d.durationHours !== undefined ? Number(d.durationHours) : null;
    const instructor = (d.instructor as string) || '';

    if (isCompact) {
      return (
        <div className={`space-y-1.5 text-xs ${className}`}>
          <div className="flex items-center justify-between">
            <span className="text-[#6F5C4A]">Môn học:</span>
            <strong className="text-[#010E1C] font-semibold">{courseName} ({courseCode})</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6F5C4A]">Số tín chỉ / Học kỳ:</span>
            <span className="text-[#010E1C]">{credits} tín chỉ • {semester || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6F5C4A]">Điểm hoàn thành:</span>
            <span className="font-mono font-bold text-[#010E1C]">
              {String(grade)} ({gradeScale === 'letter' ? 'Thang chữ' : `Thang ${gradeScale}`})
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className={`space-y-4 ${className}`}>
        <div className="p-4 rounded-xl bg-[#FAF4DF]/60 border border-[#E3D5B8]/60 space-y-3">
          <div className="flex items-start justify-between gap-3 border-b border-[#E3D5B8]/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#6F5C4A] bg-[#FFFDF7] px-2 py-0.5 rounded border border-[#E3D5B8]">
                  {courseCode}
                </span>
                <span className="text-xs text-[#A48B73]">Khóa học hoàn thành</span>
              </div>
              <h4 className="font-serif font-bold text-base text-[#010E1C] mt-1">
                {courseName}
              </h4>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-[#6F5C4A] block">Điểm đạt được</span>
              <div className="font-mono font-bold text-xl text-[#010E1C]">
                {String(grade)}
                {grade4 !== null && (
                  <span className="text-xs font-normal text-[#6F5C4A] ml-1">({grade4.toFixed(1)}/4.0)</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[#6F5C4A] text-[11px] block">Số tín chỉ</span>
              <strong className="text-[#010E1C] font-mono">{credits} TC</strong>
            </div>
            <div>
              <span className="text-[#6F5C4A] text-[11px] block">Học kỳ</span>
              <strong className="text-[#010E1C]">{semester || '—'}</strong>
            </div>
            {durationHours && (
              <div>
                <span className="text-[#6F5C4A] text-[11px] block">Thời lượng</span>
                <strong className="text-[#010E1C] font-mono">{durationHours} giờ</strong>
              </div>
            )}
            {instructor && (
              <div>
                <span className="text-[#6F5C4A] text-[11px] block">Giảng viên</span>
                <strong className="text-[#010E1C] truncate block" title={instructor}>{instructor}</strong>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. TÍCH LŨY TÍN CHỈ (CREDIT)
  if (type === 'credit') {
    const programName = (d.programName as string) || 'Chương trình Tích lũy Tín chỉ Đại học';
    const totalCredits = (d.totalCredits as number) || 130;
    const completedCredits = (d.completedCredits as number) || 120;
    const progressPercent = totalCredits > 0 ? Math.min(100, Math.round((completedCredits / totalCredits) * 100)) : 0;
    const gpaVal = d.gpa !== undefined && d.gpa !== null ? Number(d.gpa) : null;
    const gradeScale = (d.gradeScale as string) || '4';
    const modules = Array.isArray(d.modules) ? (d.modules as Array<Record<string, unknown>>) : [];

    if (isCompact) {
      return (
        <div className={`space-y-1.5 text-xs ${className}`}>
          <div className="flex items-center justify-between">
            <span className="text-[#6F5C4A]">Chương trình:</span>
            <strong className="text-[#010E1C] font-semibold truncate max-w-[200px]" title={programName}>{programName}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6F5C4A]">Tiến độ tích lũy:</span>
            <span className="font-mono text-[#010E1C] font-bold">{completedCredits} / {totalCredits} TC ({progressPercent}%)</span>
          </div>
          {gpaVal !== null && (
            <div className="flex items-center justify-between">
              <span className="text-[#6F5C4A]">GPA tích lũy:</span>
              <span className="font-mono font-bold text-[#010E1C]">{gpaVal.toFixed(2)} (Thang {gradeScale})</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`space-y-4 ${className}`}>
        <div className="p-4 rounded-xl bg-[#FAF4DF]/60 border border-[#E3D5B8]/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E3D5B8]/60 pb-3">
            <div>
              <span className="text-[11px] uppercase font-bold text-[#6F5C4A] block">Chương trình tích lũy</span>
              <h4 className="font-serif font-bold text-base text-[#010E1C]">
                {programName}
              </h4>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-[#6F5C4A] block">Tín chỉ hoàn thành</span>
                <span className="font-mono font-bold text-base text-[#010E1C]">
                  {completedCredits} <span className="text-xs font-normal text-[#6F5C4A]">/ {totalCredits} TC</span>
                </span>
              </div>
              {gpaVal !== null && (
                <div className="text-right pl-3 border-l border-[#E3D5B8]">
                  <span className="text-[10px] text-[#6F5C4A] block">GPA tích lũy</span>
                  <span className="font-mono font-bold text-base text-[#010E1C]">
                    {gpaVal.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Thanh tiến độ */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-[#6F5C4A]">
              <span>Tiến độ chương trình</span>
              <span className="font-mono font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#E3D5B8]/60 overflow-hidden">
              <div
                className="h-full bg-[#E6AB42] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Danh sách module học phần nếu có */}
          {modules.length > 0 && (
            <div className="pt-2 border-t border-[#E3D5B8]/40 space-y-2">
              <span className="text-[11px] font-semibold text-[#010E1C] block">Học phần tiêu biểu:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {modules.map((m, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-[#FFFDF7] border border-[#E3D5B8]/60 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-[11px] text-[#6F5C4A] mr-1.5">{m.code as string}</span>
                      <span className="text-[#010E1C]">{m.name as string}</span>
                    </div>
                    <span className="font-mono font-bold text-[#010E1C] shrink-0 ml-2">
                      {String(m.grade)} ({m.credits as number}TC)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. CHỨNG CHỈ KHÁC / GIẤY CHỨNG NHẬN (OTHER)
  const title = (d.title as string) || 'Giấy chứng nhận thành tích';
  const description = (d.description as string) || '';
  const organizer = (d.organizer as string) || '';
  const eventDate = (d.eventDate as string) || '';
  const role = (d.role as string) || '';
  const result = (d.result as string) || '';
  const validUntil = (d.validUntil as string) || '';

  if (isCompact) {
    return (
      <div className={`space-y-1.5 text-xs ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-[#6F5C4A]">Nội dung:</span>
          <strong className="text-[#010E1C] font-semibold truncate max-w-[200px]" title={title}>{title}</strong>
        </div>
        {result && (
          <div className="flex items-center justify-between">
            <span className="text-[#6F5C4A]">Xếp hạng / Thành tích:</span>
            <strong className="text-[#010E1C]">{result}</strong>
          </div>
        )}
        {organizer && (
          <div className="flex items-center justify-between">
            <span className="text-[#6F5C4A]">Đơn vị tổ chức:</span>
            <span className="text-[#6F5C4A]">{organizer}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="p-4 rounded-xl bg-[#FAF4DF]/60 border border-[#E3D5B8]/60 space-y-3">
        <div className="border-b border-[#E3D5B8]/60 pb-3">
          <span className="text-[11px] uppercase font-bold text-[#6F5C4A] block">Giấy chứng nhận</span>
          <h4 className="font-serif font-bold text-lg text-[#010E1C]">
            {title}
          </h4>
          {description && (
            <p className="text-xs text-[#6F5C4A] mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {organizer && (
            <div>
              <span className="text-[#6F5C4A] text-[11px] block">Đơn vị tổ chức</span>
              <strong className="text-[#010E1C]">{organizer}</strong>
            </div>
          )}
          {eventDate && (
            <div>
              <span className="text-[#6F5C4A] text-[11px] block">Ngày diễn ra</span>
              <strong className="text-[#010E1C]">{eventDate}</strong>
            </div>
          )}
          {role && (
            <div>
              <span className="text-[#6F5C4A] text-[11px] block">Vai trò</span>
              <strong className="text-[#010E1C]">{role}</strong>
            </div>
          )}
          {result && (
            <div>
              <span className="text-[#6F5C4A] text-[11px] block">Thành tích</span>
              <strong className="text-[#010E1C]">{result}</strong>
            </div>
          )}
          {validUntil && (
            <div>
              <span className="text-[#6F5C4A] text-[11px] block">Hiệu lực đến</span>
              <strong className="text-[#010E1C]">{validUntil}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

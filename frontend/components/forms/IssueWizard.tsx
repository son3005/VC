'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { PdfButton } from '@/components/certificate/PdfButton';
import { TxStatus, type TxState } from '@/components/tx/TxStatus';
import { api, ApiRequestError } from '@/lib/api';
import {
  issueCertificateOnChain,
  assertCorrectNetworkAndSigner,
} from '@/lib/contract';
import {
  certificateIdRegexMap,
  issueBaseSchema,
  degreeDetailsSchema,
  courseDetailsSchema,
  creditDetailsSchema,
  otherDetailsSchema,
} from '@/lib/validation';
import { formatBytes, shortenAddress } from '@/lib/format';
import { CERTIFICATE_TYPE_LABELS } from '@/lib/constants';
import type { CertificateType, PrepareCertificateResponse } from '@/types/api';
import {
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  KeyRound,
  FileText,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function classifyGpa(gpa: number): string {
  if (gpa >= 3.6) return 'Xuất sắc';
  if (gpa >= 3.2) return 'Giỏi';
  if (gpa >= 2.5) return 'Khá';
  if (gpa >= 2.0) return 'Trung bình';
  return 'Yếu';
}

function formatDateInput(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function IssueWizard() {
  const { user } = useAuth();
  const { address, isCorrectNetwork, switchToSepolia } = useWallet();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Dữ liệu Form Bước 1
  const [certType, setCertType] = useState<CertificateType>('degree');
  const [certId, setCertId] = useState('UIT-DEG-2026-0001');
  const [studentName, setStudentName] = useState('');
  const [studentCode, setStudentCode] = useState('');

  // Details cho từng loại khớp chuẩn backend
  const [degreeDetails, setDegreeDetails] = useState({
    degreeTitle: 'Cử nhân',
    major: 'Kỹ thuật phần mềm',
    graduationYear: 2026,
    gpa: 3.5,
    studyMode: 'Chính quy',
    thesisTitle: '',
  });

  const [courseDetails, setCourseDetails] = useState({
    courseCode: 'CS409',
    courseName: 'Lập trình ứng dụng Blockchain và Hợp đồng thông minh',
    credits: 3,
    semester: 'Học kỳ 1 2025-2026',
    gradeScale: '10' as '10' | '4' | 'letter',
    grade: '8.5',
    grade4: '3.5',
    durationHours: '45',
    instructor: 'TS. Nguyễn Văn B',
  });

  const [creditDetails, setCreditDetails] = useState({
    programName: 'Chương trình Đào tạo Cử nhân Khoa học Máy tính',
    totalCredits: 130,
    completedCredits: 120,
    gpa: '3.52',
  });

  const [otherDetails, setOtherDetails] = useState({
    title: 'Chứng nhận Hoàn thành Dự án Nghiên cứu Khoa học',
    description: 'Đã hoàn thành xuất sắc đề tài nghiên cứu ứng dụng công nghệ chuỗi khối trong xác thực văn bằng.',
    organizer: 'Phòng Quản lý Khoa học & Công nghệ',
    eventDate: '2026-05-20',
    role: 'Trưởng nhóm nghiên cứu',
    result: 'Giải Nhất cấp Trường',
    validUntil: '',
  });

  // State lỗi validation Bước 1
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Kết quả Bước 2: Prepare Response
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparedData, setPreparedData] = useState<PrepareCertificateResponse | null>(null);

  // State Bước 3: Ký Blockchain
  const [txState, setTxState] = useState<TxState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // State Bước 4: Confirm API
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Khi đổi certType, cập nhật mẫu mã văn bằng gợi ý
  const handleTypeChange = (newType: CertificateType) => {
    setCertType(newType);
    const year = new Date().getFullYear();
    const prefixMap = {
      degree: `UIT-DEG-${year}-0001`,
      course: `UIT-CRS-${year}-0001`,
      credit: `UIT-CRE-${year}-0001`,
      other: `UIT-OTH-${year}-0001`,
    };
    setCertId(prefixMap[newType]);
  };

  const handleCourseGradeScaleChange = (
    gradeScale: '10' | '4' | 'letter'
  ) => {
    setCourseDetails((prev) => ({
      ...prev,
      gradeScale,
      grade: gradeScale === 'letter' ? 'A' : gradeScale === '4' ? '3.5' : '8.5',
      grade4: gradeScale === '10' ? '3.5' : '',
    }));
  };

  // Làm sạch và ép kiểu dữ liệu gửi Backend API
  const getActiveDetails = () => {
    switch (certType) {
      case 'degree':
        return {
          degreeTitle: degreeDetails.degreeTitle.trim(),
          major: degreeDetails.major.trim(),
          graduationYear: Number(degreeDetails.graduationYear),
          gpa: Number(degreeDetails.gpa),
          classification: classifyGpa(Number(degreeDetails.gpa)),
          studyMode: degreeDetails.studyMode.trim() || undefined,
          thesisTitle: degreeDetails.thesisTitle.trim() || undefined,
        };
      case 'course': {
        const rawGrade = courseDetails.grade.trim();
        const parsedGrade =
          courseDetails.gradeScale === 'letter'
            ? rawGrade
            : isNaN(parseFloat(rawGrade))
            ? 0
            : parseFloat(rawGrade);

        return {
          courseCode: courseDetails.courseCode.trim(),
          courseName: courseDetails.courseName.trim(),
          credits: Number(courseDetails.credits),
          semester: courseDetails.semester.trim(),
          gradeScale: courseDetails.gradeScale,
          grade: parsedGrade,
          grade4:
            courseDetails.grade4 !== '' && !isNaN(Number(courseDetails.grade4))
              ? Number(courseDetails.grade4)
              : undefined,
          durationHours:
            courseDetails.durationHours !== '' && !isNaN(Number(courseDetails.durationHours))
              ? Number(courseDetails.durationHours)
              : undefined,
          instructor: courseDetails.instructor.trim() || undefined,
        };
      }
      case 'credit':
        return {
          programName: creditDetails.programName.trim(),
          totalCredits: Number(creditDetails.totalCredits),
          completedCredits: Number(creditDetails.completedCredits),
          gradeScale: '4',
          gpa:
            creditDetails.gpa !== '' && !isNaN(Number(creditDetails.gpa))
              ? Number(creditDetails.gpa)
              : undefined,
        };
      case 'other':
        return {
          title: otherDetails.title.trim(),
          description: otherDetails.description.trim(),
          organizer: otherDetails.organizer.trim() || undefined,
          eventDate: otherDetails.eventDate
            ? formatDateInput(otherDetails.eventDate)
            : undefined,
          role: otherDetails.role.trim() || undefined,
          result: otherDetails.result.trim() || undefined,
          validUntil: otherDetails.validUntil
            ? formatDateInput(otherDetails.validUntil)
            : undefined,
        };
    }
  };

  // Validate Bước 1
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate base
    const baseResult = issueBaseSchema.safeParse({
      certificateType: certType,
      certificateId: certId.trim(),
      studentName: studentName.trim(),
      studentCode: studentCode.trim(),
    });

    if (!baseResult.success) {
      baseResult.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
    }

    // Regex check theo loại
    const regex = certificateIdRegexMap[certType];
    if (regex && !regex.test(certId.trim())) {
      errors.certificateId = `Mã không đúng định dạng chuẩn của loại ${certType}. Ví dụ hợp lệ: UIT-${certType.slice(0, 3).toUpperCase()}-2026-0001`;
    }

    // Validate details theo schema tương ứng
    const activeDetails = getActiveDetails();
    if (certType === 'degree') {
      const detailRes = degreeDetailsSchema.safeParse(activeDetails);
      if (!detailRes.success) {
        detailRes.error.errors.forEach((err) => {
          if (err.path[0]) errors[`degree_${err.path[0]}`] = err.message;
        });
      }
    } else if (certType === 'course') {
      const detailRes = courseDetailsSchema.safeParse(activeDetails);
      if (!detailRes.success) {
        detailRes.error.errors.forEach((err) => {
          if (err.path[0]) errors[`course_${err.path[0]}`] = err.message;
        });
      }
    } else if (certType === 'credit') {
      const detailRes = creditDetailsSchema.safeParse(activeDetails);
      if (!detailRes.success) {
        detailRes.error.errors.forEach((err) => {
          if (err.path[0]) errors[`credit_${err.path[0]}`] = err.message;
        });
      }
    } else if (certType === 'other') {
      const detailRes = otherDetailsSchema.safeParse(activeDetails);
      if (!detailRes.success) {
        detailRes.error.errors.forEach((err) => {
          if (err.path[0]) errors[`other_${err.path[0]}`] = err.message;
        });
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Bước 1 -> Bước 2: Gọi Prepare API
  const handleProceedToStep2 = async () => {
    if (!validateStep1()) {
      toast.error('Vui lòng kiểm tra và hoàn thành các trường bắt buộc.');
      return;
    }

    setIsPreparing(true);
    try {
      const payload = {
        certificateType: certType,
        certificateId: certId.trim(),
        studentName: studentName.trim(),
        studentCode: studentCode.trim(),
        details: getActiveDetails(),
      };

      const res = await api.prepareCertificate(payload);
      setPreparedData(res.data);
      setStep(2);
      toast.success('Đã sinh file PDF văn bằng và mã băm SHA-256 thành công!');
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        toast.error(err.message || 'Lỗi khi chuẩn bị văn bằng.');
      } else {
        toast.error('Không thể kết nối đến máy chủ.');
      }
    } finally {
      setIsPreparing(false);
    }
  };

  // Bước 2 -> Bước 3: Ký on-chain qua MetaMask
  const handleSignOnChain = async () => {
    if (!preparedData) {
      toast.error('Thiếu dữ liệu văn bằng đã chuẩn bị.');
      return;
    }

    setTxError(null);
    setTxState('prompting');

    try {
      // Kiểm tra tính hợp lệ của mạng và ví trước khi gửi tx
      await assertCorrectNetworkAndSigner(user?.walletAddress);

      // Gửi giao dịch lên smart contract
      const hash = await issueCertificateOnChain(
        certId.trim(),
        preparedData.fileHash,
        preparedData.cid
      );

      setTxHash(hash);
      setTxState('success');
      toast.success('Giao dịch Blockchain đã được xác nhận thành công!');

      // Tự động chuyển sang Bước 4: Đồng bộ Confirm API
      handleConfirmApi(hash);
    } catch (err: unknown) {
      const errorObj = err as { code?: number | string; message?: string };

      if (errorObj?.code === 4001 || errorObj?.message?.includes('user rejected')) {
        setTxState('rejected');
        setTxError('Bạn đã hủy ký giao dịch trên MetaMask.');
        toast.error('Giao dịch bị từ chối bởi người dùng.');
      } else if (
        errorObj?.message?.includes('CertificateExists') ||
        errorObj?.message?.includes('execution reverted')
      ) {
        setTxState('reverted');
        setTxError('Mã văn bằng này đã tồn tại trên Smart Contract hoặc bị từ chối.');
        toast.error('Lỗi: Mã văn bằng đã tồn tại trên Blockchain.');
      } else {
        setTxState('error');
        setTxError(errorObj?.message || 'Có lỗi xảy ra khi gửi giao dịch on-chain.');
        toast.error('Không thể hoàn tất giao dịch on-chain.');
      }
    }
  };

  // Bước 4: Gọi Confirm API lưu vào hệ thống
  const handleConfirmApi = async (hashToConfirm?: string) => {
    const activeHash = hashToConfirm || txHash;
    if (!activeHash || !preparedData) {
      toast.error('Thiếu mã giao dịch on-chain để đồng bộ.');
      return;
    }

    setStep(4);
    setIsConfirming(true);
    setConfirmError(null);

    try {
      const payload = {
        certificateType: certType,
        certificateId: certId.trim(),
        studentName: studentName.trim(),
        studentCode: studentCode.trim(),
        details: getActiveDetails(),
        fileHash: preparedData.fileHash,
        ipfsCid: preparedData.cid,
        artifactType: 'pdf',
        mimeType: 'application/pdf',
        filename: preparedData.filename,
        sizeBytes: preparedData.sizeBytes,
        templateId: preparedData.templateId,
        templateVersion: preparedData.templateVersion,
        txHash: activeHash,
      };

      await api.confirmCertificate(payload);
      setConfirmSuccess(true);
      toast.success('Văn bằng đã được lưu chính thức vào hệ thống!');
    } catch (err: unknown) {
      setConfirmSuccess(false);
      if (err instanceof ApiRequestError) {
        setConfirmError(err.message || 'Lỗi khi lưu xác nhận giao dịch.');
      } else {
        setConfirmError('Lỗi kết nối máy chủ. Bạn có thể nhấn nút "Thử lưu lại" bên dưới.');
      }
    } finally {
      setIsConfirming(false);
    }
  };

  // Reset form để cấp văn bằng khác
  const handleResetForm = () => {
    setStep(1);
    setStudentName('');
    setStudentCode('');
    // Tạo mã mới ngẫu nhiên để tránh xung đột mã cũ (409)
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const prefixMap = {
      degree: `UIT-DEG-${year}-${rand}`,
      course: `UIT-CRS-${year}-${rand}`,
      credit: `UIT-CRE-${year}-${rand}`,
      other: `UIT-OTH-${year}-${rand}`,
    };
    setCertId(prefixMap[certType]);
    setPreparedData(null);
    setTxHash(null);
    setTxState('idle');
    setTxError(null);
    setConfirmSuccess(false);
    setConfirmError(null);
    setFormErrors({});
  };

  const stepsHeader = [
    { num: 1, title: 'Nhập thông tin' },
    { num: 2, title: 'Xem trước & Hash' },
    { num: 3, title: 'Ký on-chain' },
    { num: 4, title: 'Xác nhận hoàn tất' },
  ];

  return (
    <div className="space-y-8">
      {/* Step Indicator Header */}
      <div className="p-4 sm:p-6 rounded-2xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stepsHeader.map((s) => {
            const isDone = step > s.num || (step === 4 && confirmSuccess);
            const isCurrent = step === s.num;

            return (
              <div
                key={s.num}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isCurrent
                    ? 'border-[#E6AB42] bg-[#FAF4DF] text-[#010E1C]'
                    : isDone
                    ? 'border-[#E3D5B8]/60 bg-[#FFFDF7] text-[#6F5C4A]'
                    : 'border-transparent text-[#A48B73]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? 'bg-[#010E1C] text-[#E6AB42]'
                      : isDone
                      ? 'bg-[#E6AB42] text-[#010E1C]'
                      : 'bg-[#FAF4DF] text-[#A48B73]'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <div className="truncate">
                  <span className="text-[10px] uppercase font-bold tracking-wider block opacity-70">
                    Bước 0{s.num}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold truncate block">
                    {s.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* BƯỚC 1: NHẬP DỮ LIỆU */}
      {/* ============================================================ */}
      {step === 1 && (
        <div className="p-6 sm:p-10 rounded-3xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-sm space-y-6">
          <div className="border-b border-[#E3D5B8]/80 pb-4">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#010E1C]">
              Bước 1: Chọn loại văn bằng & nhập thông tin sinh viên
            </h3>
            <p className="text-xs text-[#6F5C4A] mt-1">
              Thông tin sẽ được dùng để tự động sinh file PDF chuẩn nhận diện của trường và tạo mã băm mật mã.
            </p>
          </div>

          <div className="space-y-5">
            {/* Loại chứng chỉ */}
            <div>
              <label className="text-xs font-semibold text-[#010E1C] uppercase tracking-wide block mb-2">
                Loại chứng chỉ / Văn bằng
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['degree', 'course', 'credit', 'other'] as CertificateType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    className={`p-3.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      certType === type
                        ? 'border-[#E6AB42] bg-[#010E1C] text-[#E6AB42] shadow-xs'
                        : 'border-[#E3D5B8] bg-[#FAF4DF] text-[#010E1C] hover:border-[#A48B73]'
                    }`}
                  >
                    <span>{CERTIFICATE_TYPE_LABELS[type]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Thông tin cơ bản: Mã, Tên, MSSV */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Mã văn bằng"
                value={certId}
                onChange={(e) => setCertId(e.target.value)}
                error={formErrors.certificateId}
                className="font-mono"
              />

              <Input
                label="Họ và tên người học"
                placeholder="Nguyễn Văn An"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                error={formErrors.studentName}
              />

              <Input
                label="Mã số sinh viên (MSSV)"
                placeholder="2311095"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                error={formErrors.studentCode}
                className="font-mono"
              />
            </div>

            {/* Form chi tiết động theo Loại văn bằng */}
            <div className="p-5 rounded-2xl bg-[#FAF4DF]/60 border border-[#E3D5B8] space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#010E1C] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E6AB42]" />
                <span>Chi tiết chuyên ngành ({CERTIFICATE_TYPE_LABELS[certType]})</span>
              </h4>

              {certType === 'degree' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <Input
                    label="Danh hiệu"
                    value={degreeDetails.degreeTitle}
                    onChange={(e) =>
                      setDegreeDetails({ ...degreeDetails, degreeTitle: e.target.value })
                    }
                    error={formErrors.degree_degreeTitle}
                  />

                  <Input
                    label="Ngành đào tạo"
                    value={degreeDetails.major}
                    onChange={(e) =>
                      setDegreeDetails({ ...degreeDetails, major: e.target.value })
                    }
                    error={formErrors.degree_major}
                  />

                  <Input
                    label="Năm tốt nghiệp"
                    type="number"
                    value={degreeDetails.graduationYear}
                    onChange={(e) =>
                      setDegreeDetails({
                        ...degreeDetails,
                        graduationYear: parseInt(e.target.value, 10) || 2026,
                      })
                    }
                    error={formErrors.degree_graduationYear}
                  />

                  <Input
                    label="Điểm trung bình (GPA)"
                    type="number"
                    step="0.01"
                    value={degreeDetails.gpa}
                    onChange={(e) =>
                      setDegreeDetails({
                        ...degreeDetails,
                        gpa: parseFloat(e.target.value) || 0,
                      })
                    }
                    error={formErrors.degree_gpa}
                  />

                  <Input
                    label="Xếp loại tốt nghiệp (tự động)"
                    value={classifyGpa(Number(degreeDetails.gpa))}
                    readOnly
                    helperText="Tự động theo GPA: ≥3.6 Xuất sắc · ≥3.2 Giỏi · ≥2.5 Khá · ≥2.0 Trung bình"
                  />

                  <Input
                    label="Hình thức đào tạo"
                    value={degreeDetails.studyMode}
                    onChange={(e) =>
                      setDegreeDetails({ ...degreeDetails, studyMode: e.target.value })
                    }
                    error={formErrors.degree_studyMode}
                  />
                </div>
              )}

              {/* 2. COURSE */}
              {certType === 'course' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <Input
                    label="Mã môn học"
                    value={courseDetails.courseCode}
                    onChange={(e) =>
                      setCourseDetails({ ...courseDetails, courseCode: e.target.value })
                    }
                    error={formErrors.course_courseCode}
                    placeholder="CS409"
                    className="font-mono uppercase"
                  />

                  <div className="sm:col-span-2">
                    <Input
                      label="Tên môn học / Khóa học"
                      value={courseDetails.courseName}
                      onChange={(e) =>
                        setCourseDetails({ ...courseDetails, courseName: e.target.value })
                      }
                      error={formErrors.course_courseName}
                      placeholder="Lập trình ứng dụng Blockchain và Hợp đồng thông minh"
                    />
                  </div>

                  <Input
                    label="Số tín chỉ (1-10)"
                    type="number"
                    value={courseDetails.credits}
                    onChange={(e) =>
                      setCourseDetails({
                        ...courseDetails,
                        credits: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    error={formErrors.course_credits}
                  />

                  <Input
                    label="Học kỳ hoàn thành"
                    value={courseDetails.semester}
                    onChange={(e) =>
                      setCourseDetails({ ...courseDetails, semester: e.target.value })
                    }
                    error={formErrors.course_semester}
                    placeholder="Học kỳ 1 2025-2026"
                  />

                  <Select
                    label="Thang điểm đánh giá"
                    value={courseDetails.gradeScale}
                    onChange={(e) =>
                      handleCourseGradeScaleChange(
                        e.target.value as '10' | '4' | 'letter'
                      )
                    }
                    options={[
                      { value: '10', label: 'Thang điểm 10 (0 - 10)' },
                      { value: '4', label: 'Thang điểm 4 (0 - 4.0)' },
                      { value: 'letter', label: 'Thang điểm chữ (A, B+, B, C...)' },
                    ]}
                  />

                  <Input
                    label={`Điểm đạt được (${
                      courseDetails.gradeScale === '10'
                        ? '0 - 10'
                        : courseDetails.gradeScale === '4'
                        ? '0 - 4.0'
                        : 'A, B+, B, C, D, F'
                    })`}
                    value={courseDetails.grade}
                    onChange={(e) =>
                      setCourseDetails({ ...courseDetails, grade: e.target.value })
                    }
                    error={formErrors.course_grade}
                    placeholder={courseDetails.gradeScale === 'letter' ? 'A' : '8.5'}
                  />

                  <Input
                    label="Điểm hệ 4 quy đổi (Tùy chọn)"
                    value={courseDetails.grade4}
                    onChange={(e) =>
                      setCourseDetails({ ...courseDetails, grade4: e.target.value })
                    }
                    placeholder="3.5"
                    disabled={courseDetails.gradeScale !== '10'}
                    helperText={
                      courseDetails.gradeScale === '10'
                        ? 'Quy đổi sang hệ 4 nếu có'
                        : 'Chỉ áp dụng khi dùng thang điểm 10'
                    }
                  />

                  <Input
                    label="Thời lượng số tiết học (Tùy chọn)"
                    type="number"
                    value={courseDetails.durationHours}
                    onChange={(e) =>
                      setCourseDetails({ ...courseDetails, durationHours: e.target.value })
                    }
                    placeholder="45"
                  />

                  <div className="sm:col-span-3">
                    <Input
                      label="Giảng viên phụ trách (Tùy chọn)"
                      value={courseDetails.instructor}
                      onChange={(e) =>
                        setCourseDetails({ ...courseDetails, instructor: e.target.value })
                      }
                      placeholder="TS. Nguyễn Văn B"
                    />
                  </div>
                </div>
              )}

              {/* 3. CREDIT */}
              {certType === 'credit' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <Input
                      label="Tên chương trình đào tạo tích lũy"
                      value={creditDetails.programName}
                      onChange={(e) =>
                        setCreditDetails({ ...creditDetails, programName: e.target.value })
                      }
                      error={formErrors.credit_programName}
                      placeholder="Chương trình Đào tạo Cử nhân Khoa học Máy tính"
                    />
                  </div>

                  <Input
                    label="Tổng số tín chỉ chương trình"
                    type="number"
                    value={creditDetails.totalCredits}
                    onChange={(e) =>
                      setCreditDetails({
                        ...creditDetails,
                        totalCredits: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    error={formErrors.credit_totalCredits}
                  />

                  <Input
                    label="Số tín chỉ đã tích lũy"
                    type="number"
                    value={creditDetails.completedCredits}
                    onChange={(e) =>
                      setCreditDetails({
                        ...creditDetails,
                        completedCredits: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    error={formErrors.credit_completedCredits}
                  />

                  <Input
                    label="Điểm trung bình tích lũy GPA (0 - 4.0, Tùy chọn)"
                    value={creditDetails.gpa}
                    onChange={(e) =>
                      setCreditDetails({ ...creditDetails, gpa: e.target.value })
                    }
                    placeholder="3.52"
                  />
                </div>
              )}

              {/* 4. OTHER */}
              {certType === 'other' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <Input
                      label="Tiêu đề chứng chỉ / Giấy chứng nhận"
                      value={otherDetails.title}
                      onChange={(e) =>
                        setOtherDetails({ ...otherDetails, title: e.target.value })
                      }
                      error={formErrors.other_title}
                      placeholder="Chứng nhận Hoàn thành Dự án Nghiên cứu Khoa học"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Input
                      label="Mô tả nội dung chứng nhận"
                      value={otherDetails.description}
                      onChange={(e) =>
                        setOtherDetails({ ...otherDetails, description: e.target.value })
                      }
                      error={formErrors.other_description}
                      placeholder="Đã hoàn thành xuất sắc đề tài nghiên cứu ứng dụng công nghệ chuỗi khối trong xác thực văn bằng."
                    />
                  </div>

                  <Input
                    label="Đơn vị tổ chức / Ban hành (Tùy chọn)"
                    value={otherDetails.organizer}
                    onChange={(e) =>
                      setOtherDetails({ ...otherDetails, organizer: e.target.value })
                    }
                    placeholder="Phòng Quản lý Khoa học & Công nghệ"
                  />

                  <Input
                    label="Ngày cấp / diễn ra (Tùy chọn)"
                    type="date"
                    value={otherDetails.eventDate}
                    onChange={(e) =>
                      setOtherDetails({ ...otherDetails, eventDate: e.target.value })
                    }
                  />

                  <Input
                    label="Vai trò tham gia (Tùy chọn)"
                    value={otherDetails.role}
                    onChange={(e) =>
                      setOtherDetails({ ...otherDetails, role: e.target.value })
                    }
                    placeholder="Trưởng nhóm nghiên cứu"
                  />

                  <Input
                    label="Kết quả / Thành tích đạt được (Tùy chọn)"
                    value={otherDetails.result}
                    onChange={(e) =>
                      setOtherDetails({ ...otherDetails, result: e.target.value })
                    }
                    placeholder="Giải Nhất cấp Trường"
                  />

                  <Input
                    label="Thời hạn giá trị (Tùy chọn)"
                    type="date"
                    value={otherDetails.validUntil}
                    onChange={(e) =>
                      setOtherDetails({ ...otherDetails, validUntil: e.target.value })
                    }
                    helperText="Để trống nếu chứng nhận có giá trị vĩnh viễn"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button
                variant="primary"
                size="lg"
                isLoading={isPreparing}
                onClick={handleProceedToStep2}
                className="gap-2 px-8"
              >
                <span>Tạo file PDF & Chuyển sang Bước 2</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BƯỚC 2: XEM TRƯỚC VÀ PREPARE */}
      {/* ============================================================ */}
      {step === 2 && preparedData && (
        <div className="p-6 sm:p-10 rounded-3xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-sm space-y-6">
          <div className="border-b border-[#E3D5B8]/80 pb-4">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#010E1C]">
              Bước 2: Xem trước tệp PDF & Kiểm tra mã băm
            </h3>
            <p className="text-xs text-[#6F5C4A] mt-1">
              Backend đã tự động tạo văn bằng PDF, tải lên mạng IPFS và tạo mã băm SHA-256 an toàn.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-[#FAF4DF]/60 border border-[#E3D5B8] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3D5B8]/60 pb-3">
                <div className="space-y-0.5">
                  <span className="font-mono text-xs font-bold text-[#010E1C]">
                    {preparedData.filename}
                  </span>
                  <p className="text-xs text-[#6F5C4A]">
                    Dung lượng: {formatBytes(preparedData.sizeBytes)} • Mẫu:{' '}
                    <span className="font-mono">{preparedData.templateId} (v{preparedData.templateVersion})</span>
                  </p>
                </div>

                <PdfButton cid={preparedData.cid} filename={preparedData.filename} size="sm" />
              </div>

              {/* Thông số CID & Hash */}
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-[#6F5C4A] block mb-0.5 font-sans font-semibold">
                    Mã băm SHA-256 (Dùng để neo trên Smart Contract):
                  </span>
                  <div className="p-2.5 rounded-lg bg-[#FFFDF7] border border-[#E3D5B8] break-all text-[#010E1C]">
                    {preparedData.fileHash}
                  </div>
                </div>

                <div>
                  <span className="text-[#6F5C4A] block mb-0.5 font-sans font-semibold">
                    Địa chỉ lưu trữ IPFS (CID):
                  </span>
                  <div className="p-2.5 rounded-lg bg-[#FFFDF7] border border-[#E3D5B8] break-all text-[#010E1C]">
                    {preparedData.cid}
                  </div>
                </div>
              </div>
            </div>

            {/* Điều hướng Bước 2 */}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                size="md"
                onClick={() => setStep(1)}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Quay lại chỉnh sửa</span>
              </Button>

              <Button
                variant="primary"
                size="lg"
                onClick={() => setStep(3)}
                className="gap-2 px-8"
              >
                <span>Tiếp tục ký ví on-chain (MetaMask)</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BƯỚC 3: KÝ VÍ ON-CHAIN METAMASK */}
      {/* ============================================================ */}
      {step === 3 && preparedData && (
        <div className="p-6 sm:p-10 rounded-3xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-sm space-y-6">
          <div className="border-b border-[#E3D5B8]/80 pb-4">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#010E1C]">
              Bước 3: Ký số giao dịch on-chain qua MetaMask
            </h3>
            <p className="text-xs text-[#6F5C4A] mt-1">
              Ghi vĩnh viễn mã văn bằng, mã băm SHA-256 và IPFS CID vào Smart Contract trên Ethereum Sepolia.
            </p>
          </div>

          <div className="space-y-5">
            {/* Hộp thông tin giao dịch chuẩn bị ký */}
            <div className="p-5 rounded-2xl bg-[#FAF4DF]/60 border border-[#E3D5B8] space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#E3D5B8]/60 pb-2">
                <span className="text-[#6F5C4A]">Mã văn bằng:</span>
                <span className="font-mono font-bold text-[#010E1C]">{certId}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#E3D5B8]/60 pb-2">
                <span className="text-[#6F5C4A]">Người nhận:</span>
                <span className="font-serif font-bold text-[#010E1C]">{studentName} (MSSV: {studentCode})</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#E3D5B8]/60 pb-2">
                <span className="text-[#6F5C4A]">Ví đơn vị cấp ký (Yêu cầu):</span>
                <span className="font-mono text-[#010E1C]">{user?.walletAddress || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6F5C4A]">Ví MetaMask hiện tại:</span>
                <span className="font-mono font-bold text-[#010E1C]">
                  {address ? shortenAddress(address, 6) : 'Chưa kết nối'}
                </span>
              </div>
            </div>

            {/* Trạng thái Transaction */}
            <TxStatus
              state={txState}
              txHash={txHash}
              errorMessage={txError}
            />

            {/* Cảnh báo sai mạng */}
            {!isCorrectNetwork && (
              <div className="p-4 rounded-xl border border-[#E6606A] bg-[#E6606A]/10 text-xs text-[#B23F4A] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Ví MetaMask đang ở sai mạng. Cần chuyển sang mạng Sepolia.</span>
                </div>
                <Button variant="danger" size="sm" onClick={() => switchToSepolia()}>
                  Chuyển sang Sepolia
                </Button>
              </div>
            )}

            {/* Điều hướng Bước 3 */}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                size="md"
                onClick={() => setStep(2)}
                disabled={txState === 'prompting' || txState === 'mining'}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </Button>

              <Button
                variant="primary"
                size="lg"
                onClick={handleSignOnChain}
                isLoading={txState === 'prompting' || txState === 'mining'}
                disabled={!isCorrectNetwork || txState === 'success'}
                className="gap-2 px-8"
              >
                <KeyRound className="w-4 h-4 text-[#E6AB42]" />
                <span>
                  {txState === 'rejected' || txState === 'error'
                    ? 'Thử ký lại với MetaMask'
                    : 'Ký xác thực on-chain'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BƯỚC 4: XÁC NHẬN VÀ LƯU HỆ THỐNG */}
      {/* ============================================================ */}
      {step === 4 && (
        <div className="p-6 sm:p-10 rounded-3xl border border-[#E3D5B8] bg-[#FFFDF7] shadow-sm space-y-6">
          {isConfirming ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-10 h-10 animate-spin text-[#E6AB42] mx-auto" />
              <h3 className="font-serif text-xl font-bold text-[#010E1C]">
                Đang lưu xác nhận vào cơ sở dữ liệu...
              </h3>
              <p className="text-xs text-[#6F5C4A]">
                Giao dịch on-chain đã thành công. Hệ thống đang đồng bộ dữ liệu giao dịch và cập nhật trạng thái văn bằng.
              </p>
            </div>
          ) : confirmSuccess ? (
            <div className="text-center space-y-6 py-6 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-[#FAF4DF] border border-[#E6AB42] flex items-center justify-center text-[#E6AB42] mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#010E1C]">
                  Cấp văn bằng thành công!
                </h3>
                <p className="text-xs sm:text-sm text-[#6F5C4A] leading-relaxed">
                  Văn bằng <strong className="font-mono text-[#010E1C]">{certId}</strong> của sinh viên{' '}
                  <strong className="text-[#010E1C]">{studentName}</strong> đã được neo vĩnh viễn trên blockchain
                  và lưu trữ an toàn trên IPFS.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link href={`/c/${encodeURIComponent(certId)}`}>
                  <Button variant="primary" size="md" className="gap-2">
                    <FileText className="w-4 h-4 text-[#E6AB42]" />
                    <span>Xem hồ sơ văn bằng</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </Button>
                </Link>

                <Button variant="outline" size="md" onClick={handleResetForm} className="gap-2">
                  <RotateCcw className="w-4 h-4 text-[#E6AB42]" />
                  <span>Cấp chứng chỉ khác</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-xl border border-[#E6606A] bg-[#E6606A]/10 text-xs text-[#B23F4A] space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>Giao dịch on-chain đã thành công nhưng chưa lưu được vào backend!</span>
                </div>
                <p>
                  Giao dịch đã được ghi nhận trên Blockchain với Tx: <code className="font-mono">{txHash}</code>.
                  {confirmError && ` Lý do lỗi: ${confirmError}`}
                </p>
                <p>
                  Bạn không cần phải ký lại giao dịch tốn phí. Hãy nhấn nút bên dưới để thử lưu lại vào hệ thống.
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleConfirmApi()}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Thử lưu lại với hệ thống</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

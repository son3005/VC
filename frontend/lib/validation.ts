import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const certificateIdRegexMap = {
  degree: /^UIT-DEG-\d{4}-\d{4}$/,
  course: /^UIT-CRS-\d{4}-\d{4}$/,
  credit: /^UIT-CRE-\d{4}-\d{4}$/,
  other: /^UIT-OTH-\d{4}-\d{4}$/,
};

export const issueBaseSchema = z.object({
  certificateType: z.enum(['degree', 'course', 'credit', 'other']),
  certificateId: z.string().min(5, 'Mã chứng chỉ không được để trống'),
  studentName: z.string().min(2, 'Họ tên từ 2 đến 100 ký tự').max(100, 'Họ tên không quá 100 ký tự'),
  studentCode: z.string().regex(/^\d{6,12}$/, 'MSSV phải là dãy từ 6 đến 12 chữ số'),
});

// Helper validate điểm số
export const gradeSchema = z.union([z.number(), z.string().min(1).max(4)]);

export function validateGradeValue(
  gradeScale: '10' | '4' | 'letter',
  grade: number | string
): string | null {
  if (gradeScale === 'letter') {
    if (typeof grade !== 'string' || !/^[A-F][+-]?$/.test(grade.trim())) {
      return 'Điểm chữ phải là A, B+, B, C+, C, D hoặc F';
    }
    return null;
  }
  const num = typeof grade === 'number' ? grade : parseFloat(grade);
  if (isNaN(num)) return 'Điểm số không hợp lệ';
  const max = gradeScale === '10' ? 10 : 4;
  if (num < 0 || num > max) {
    return `Điểm phải nằm trong khoảng 0 – ${max}`;
  }
  return null;
}

// 1. Degree Details (Khớp backend degreeDetailsSchema)
export const degreeDetailsSchema = z.object({
  degreeTitle: z.string().min(2, 'Danh hiệu tối thiểu 2 ký tự').max(50, 'Danh hiệu tối đa 50 ký tự'),
  major: z.string().min(2, 'Ngành đào tạo tối thiểu 2 ký tự').max(100, 'Ngành tối đa 100 ký tự'),
  graduationYear: z.coerce.number().int().min(2000, 'Năm từ 2000').max(2100, 'Năm tối đa 2100'),
  gpa: z.coerce.number().min(0, 'GPA từ 0').max(4, 'GPA tối đa 4.0'),
  classification: z.string().min(2, 'Xếp loại tối thiểu 2 ký tự').max(50),
  studyMode: z.string().max(50).optional(),
  thesisTitle: z.string().max(200).optional(),
});

// 2. Course Details (Khớp backend courseDetailsSchema)
export const courseDetailsSchema = z
  .object({
    courseCode: z.string().min(2, 'Mã môn từ 2 ký tự').max(30, 'Mã môn tối đa 30 ký tự'),
    courseName: z.string().min(2, 'Tên môn học từ 2 ký tự').max(150, 'Tên môn tối đa 150 ký tự'),
    credits: z.coerce.number().int().min(1, 'Số tín chỉ từ 1').max(10, 'Số tín chỉ tối đa 10'),
    semester: z.string().min(2, 'Học kỳ từ 2 ký tự').max(50, 'Học kỳ tối đa 50 ký tự'),
    gradeScale: z.enum(['10', '4', 'letter']),
    grade: gradeSchema,
    grade4: z.coerce.number().min(0).max(4).optional(),
    durationHours: z.coerce.number().int().positive('Thời lượng phải > 0').optional(),
    instructor: z.string().max(100).optional(),
  })
  .superRefine((val, ctx) => {
    const err = validateGradeValue(val.gradeScale, val.grade);
    if (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['grade'],
        message: err,
      });
    }
  });

// Module con trong Credit
export const creditModuleSchema = z.object({
  code: z.string().min(2, 'Mã môn tối thiểu 2 ký tự').max(30),
  name: z.string().min(2, 'Tên môn tối thiểu 2 ký tự').max(150),
  credits: z.coerce.number().int().min(1).max(10),
  grade: gradeSchema,
  grade4: z.coerce.number().min(0).max(4).optional(),
});

// 3. Credit Details (Khớp backend creditDetailsSchema)
export const creditDetailsSchema = z
  .object({
    programName: z.string().min(2, 'Tên chương trình từ 2 ký tự').max(150, 'Tên chương trình tối đa 150 ký tự'),
    totalCredits: z.coerce.number().int().positive('Tổng tín chỉ phải > 0').max(300, 'Tối đa 300 tín chỉ'),
    completedCredits: z.coerce.number().int().min(0, 'Tín chỉ tích lũy từ 0').max(300),
    gpa: z.coerce.number().min(0).max(4).optional(),
    gradeScale: z.enum(['10', '4', 'letter']),
    modules: z.array(creditModuleSchema).max(8).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.completedCredits > val.totalCredits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['completedCredits'],
        message: 'Tín chỉ tích lũy không được lớn hơn tổng số tín chỉ',
      });
    }
  });

// 4. Other Details (Khớp backend otherDetailsSchema)
export const otherDetailsSchema = z.object({
  title: z.string().min(2, 'Tiêu đề từ 2 ký tự').max(100, 'Tiêu đề tối đa 100 ký tự'),
  description: z.string().min(2, 'Mô tả từ 2 ký tự').max(300, 'Mô tả tối đa 300 ký tự'),
  organizer: z.string().max(150).optional(),
  eventDate: z.string().max(40).optional(),
  role: z.string().max(100).optional(),
  result: z.string().max(100).optional(),
  validUntil: z.string().max(40).optional(),
});

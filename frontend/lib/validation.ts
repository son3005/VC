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

export const degreeDetailsSchema = z.object({
  degreeTitle: z.string().min(1, 'Danh hiệu không được để trống'),
  major: z.string().min(1, 'Ngành đào tạo không được để trống'),
  graduationYear: z.coerce.number().int().min(2000).max(2100),
  gpa: z.coerce.number().min(0).max(4),
  classification: z.enum(['Xuất sắc', 'Giỏi', 'Khá', 'Trung bình']),
  studyMode: z.string().min(1, 'Hình thức đào tạo không được để trống'),
});

export const courseDetailsSchema = z.object({
  courseName: z.string().min(1, 'Tên khóa học không được để trống'),
  courseCode: z.string().min(1, 'Mã khóa học không được để trống'),
  issueDate: z.string().min(1, 'Ngày hoàn thành không được để trống'),
  completionScore: z.coerce.number().min(0).max(100).optional(),
});

export const creditDetailsSchema = z.object({
  subjectName: z.string().min(1, 'Tên học phần không được để trống'),
  subjectCode: z.string().min(1, 'Mã học phần không được để trống'),
  credits: z.coerce.number().int().min(1).max(30),
  grade: z.string().min(1, 'Điểm chữ không được để trống'),
  semester: z.string().min(1, 'Học kỳ không được để trống'),
});

export const otherDetailsSchema = z.object({
  title: z.string().min(1, 'Tiêu đề chứng chỉ không được để trống'),
  description: z.string().min(1, 'Mô tả nội dung không được để trống'),
});

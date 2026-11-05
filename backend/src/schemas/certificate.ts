/**
 * @file certificate.ts
 * @description Bộ Schema xác thực và chuẩn hóa dữ liệu chứng chỉ/văn bằng số (Certificate Validation Schemas).
 * 
 * Các tính năng kiến trúc chính:
 * 1. Đa hình hóa Schema (Polymorphic Validation):
 *    Sử dụng `z.discriminatedUnion` theo trường `certificateType` để hỗ trợ 4 phân loại văn bằng:
 *    - `degree`: Bằng tốt nghiệp cử nhân / kỹ sư / thạc sĩ.
 *    - `course`: Chứng chỉ hoàn thành môn học / học phần.
 *    - `credit`: Chứng chỉ tích lũy tín chỉ chuyên ngành.
 *    - `other`: Giấy chứng nhận tham gia hội thảo, workshop hoặc hoạt động ngoại khóa.
 * 2. Ràng buộc tiền tố định danh (Identifier Invariants):
 *    Đảm bảo mã `certificateId` phải luôn bắt đầu bằng tiền tố quy định tương ứng (`UIT-DEG`, `UIT-CRS`, `UIT-CRE`, `UIT-OTH`).
 * 3. Kiểm định thang điểm linh hoạt (Multi-scale Grade Validation):
 *    Hỗ trợ kiểm tra hợp lệ thang điểm 10, thang điểm 4 và điểm chữ (`letter`: A, B+, B, C+, C, D, F).
 * 4. Xác thực chứng từ kỹ thuật On-chain & IPFS:
 *    Kiểm tra mã băm bảo mật SHA-256, Content Identifier (CID) IPFS và Transaction Hash Blockchain.
 */

import { z } from "zod";
import {
  artifactTypeSchema,
  certificateIdSchema,
  certificateStatusSchema,
  certificateTypeSchema,
  cidSchema,
  fileHashSchema,
  paginationSchema,
  txHashSchema,
} from "./common";

/**
 * Schema xác thực họ và tên người học / sinh viên
 * - Độ dài: 2 đến 100 ký tự.
 * - Tự động cắt khoảng trắng thừa hai đầu.
 */
const studentNameSchema = z
  .string()
  .min(2, "Họ tên quá ngắn")
  .max(100, "Họ tên quá dài")
  .trim();

/**
 * Schema xác thực Mã số sinh viên (MSSV)
 * - Định dạng: Bắt buộc từ 6 đến 12 ký tự số liên tiếp.
 */
const studentCodeSchema = z
  .string()
  .regex(/^[0-9]{6,12}$/, "MSSV phải gồm 6–12 chữ số");

/**
 * Schema xác thực năm tốt nghiệp / năm học
 * - Chuyển đổi linh hoạt sang số nguyên (z.coerce.number).
 * - Nằm trong khoảng thế kỷ 21 hợp lệ: 2000 đến 2100.
 */
const yearSchema = z.coerce
  .number()
  .int()
  .min(2000, "Năm không hợp lệ")
  .max(2100, "Năm không hợp lệ");

/**
 * Schema kiểu dữ liệu điểm số: chấp nhận số thực hoặc chuỗi điểm chữ (ví dụ: 'A', 'B+')
 */
const gradeSchema = z.union([z.number(), z.string().min(1).max(4)]);

/**
 * Hàm trợ giúp (Helper Function) kiểm tra tính hợp lệ của điểm số theo thang điểm được chọn
 * @param gradeScale Thang điểm áp dụng ("10" | "4" | "letter")
 * @param grade Giá trị điểm số cần kiểm tra (number hoặc string)
 * @param ctx Ngữ cảnh Zod Refinement để gán lỗi tùy biến
 * @param path Đường dẫn thuộc tính báo lỗi (mặc định là ["grade"])
 */
function validateGrade(
  gradeScale: "10" | "4" | "letter",
  grade: number | string,
  ctx: z.RefinementCtx,
  path: (string | number)[] = ["grade"]
): void {
  // Kiểm tra điểm chữ: A, B+, B, C+, C, D, F
  if (gradeScale === "letter") {
    if (typeof grade !== "string" || !/^[A-F][+-]?$/.test(grade)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: "Điểm chữ phải là A, B+, B, C+, C, D hoặc F",
      });
    }
    return;
  }

  // Với thang 10 hoặc thang 4, điểm bắt buộc phải là số
  if (typeof grade !== "number") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: "Điểm phải là số",
    });
    return;
  }

  // Kiểm tra ngưỡng giá trị theo thang điểm
  const max = gradeScale === "10" ? 10 : 4;
  if (grade < 0 || grade > max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: `Điểm phải nằm trong 0–${max}`,
    });
  }
}

// ---------------------------------------------------------------------------
// Details theo từng loại văn bằng / chứng chỉ
// ---------------------------------------------------------------------------

/**
 * Chi tiết văn bằng tốt nghiệp (Degree Details)
 * Bao gồm danh hiệu bằng cấp, ngành đào tạo, năm tốt nghiệp, điểm GPA và xếp loại.
 */
export const degreeDetailsSchema = z.object({
  degreeTitle: z.string().min(2).max(50),
  major: z.string().min(2).max(100),
  graduationYear: yearSchema,
  gpa: z.number().min(0).max(4),
  classification: z.string().min(2).max(50),
  studyMode: z.string().max(50).optional(),
  thesisTitle: z.string().max(200).optional(),
});

/**
 * Chi tiết chứng chỉ môn học / học phần (Course Details)
 * Bao gồm mã môn, tên môn, số tín chỉ, học kỳ, điểm số và thang điểm áp dụng.
 */
export const courseDetailsSchema = z
  .object({
    courseCode: z.string().min(2).max(30),
    courseName: z.string().min(2).max(150),
    credits: z.number().int().min(1).max(10),
    semester: z.string().min(2).max(50),
    grade: gradeSchema,
    gradeScale: z.enum(["10", "4", "letter"]),
    grade4: z.number().min(0).max(4).optional(),
    durationHours: z.number().int().positive().optional(),
    instructor: z.string().max(100).optional(),
  })
  .superRefine((value, ctx) => {
    validateGrade(value.gradeScale, value.grade, ctx);
  });

/**
 * Cấu trúc module học phần trong chứng chỉ tích lũy tín chỉ
 */
export const creditModuleSchema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(2).max(150),
  credits: z.number().int().min(1).max(10),
  grade: gradeSchema,
  grade4: z.number().min(0).max(4).optional(),
});

/**
 * Chi tiết chứng chỉ tích lũy tín chỉ (Credit Details)
 * Đảm bảo số tín chỉ hoàn thành không vượt quá tổng số tín chỉ và kiểm tra điểm của từng module.
 */
export const creditDetailsSchema = z
  .object({
    programName: z.string().min(2).max(150),
    totalCredits: z.number().int().positive().max(300),
    completedCredits: z.number().int().nonnegative().max(300),
    gpa: z.number().min(0).max(4).optional(),
    gradeScale: z.enum(["10", "4", "letter"]),
    modules: z.array(creditModuleSchema).max(8).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.completedCredits > value.totalCredits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completedCredits"],
        message: "Số tín chỉ đã tích lũy không được lớn hơn tổng",
      });
    }

    value.modules?.forEach((module, index) => {
      validateGrade(value.gradeScale, module.grade, ctx, [
        "modules",
        index,
        "grade",
      ]);
    });
  });

/**
 * Chi tiết chứng nhận hoạt động khác / hội thảo (Other Details)
 */
export const otherDetailsSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().min(2).max(300),
  organizer: z.string().max(150).optional(),
  eventDate: z.string().max(40).optional(),
  role: z.string().max(100).optional(),
  result: z.string().max(100).optional(),
  validUntil: z.string().max(40).optional(),
});

// ---------------------------------------------------------------------------
// Envelope: certificateType quyết định cấu trúc details
// ---------------------------------------------------------------------------

/**
 * Các thuộc tính định danh cơ sở chung cho mọi loại chứng chỉ
 */
const baseFields = {
  certificateId: certificateIdSchema,
  studentName: studentNameSchema,
  studentCode: studentCodeSchema,
};

/**
 * Schema xác thực dữ liệu khởi tạo bản ghi văn bằng / chứng chỉ (Draft Certificate)
 * - Sử dụng Discriminated Union theo thuộc tính `certificateType`.
 * - Tự động đối chiếu tiền tố mã chứng chỉ qua `superRefine`.
 */
export const prepareCertificateSchema = z
  .discriminatedUnion("certificateType", [
    z.object({
      certificateType: z.literal("degree"),
      ...baseFields,
      details: degreeDetailsSchema,
    }),
    z.object({
      certificateType: z.literal("course"),
      ...baseFields,
      details: courseDetailsSchema,
    }),
    z.object({
      certificateType: z.literal("credit"),
      ...baseFields,
      details: creditDetailsSchema,
    }),
    z.object({
      certificateType: z.literal("other"),
      ...baseFields,
      details: otherDetailsSchema,
    }),
  ])
  .superRefine((value, ctx) => {
    const prefix: Record<typeof value.certificateType, string> = {
      degree: "UIT-DEG",
      course: "UIT-CRS",
      credit: "UIT-CRE",
      other: "UIT-OTH",
    };

    if (!value.certificateId.startsWith(prefix[value.certificateType])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["certificateId"],
        message: `Mã chứng chỉ loại ${value.certificateType} phải bắt đầu bằng ${prefix[value.certificateType]}`,
      });
    }
  });

/**
 * Schema xác thực dữ liệu khi hoàn tất phát hành văn bằng lên Blockchain & IPFS
 * Kết hợp thông tin văn bằng ban đầu với chứng từ kỹ thuật (Artifact metadata & TxHash).
 */
export const confirmCertificateSchema = prepareCertificateSchema.and(
  z.object({
    fileHash: fileHashSchema,
    ipfsCid: cidSchema,
    artifactType: artifactTypeSchema,
    mimeType: z.string().min(3).max(100),
    filename: z.string().min(1).max(120),
    sizeBytes: z.coerce.number().int().min(1).max(10 * 1024 * 1024),
    templateId: z.string().min(2).max(40),
    templateVersion: z.string().min(1).max(20),
    txHash: txHashSchema,
  })
);

/** Alias để tương thích và dễ đọc trong Controller */
export const issueCertificateSchema = confirmCertificateSchema;

/** Kiểu TypeScript tĩnh cho dữ liệu tạo nháp chứng chỉ */
export type PrepareCertificateInput = z.infer<typeof prepareCertificateSchema>;

/** Kiểu TypeScript tĩnh cho dữ liệu xác nhận phát hành chứng chỉ */
export type ConfirmCertificateInput = z.infer<typeof confirmCertificateSchema>;

/**
 * Schema xác thực yêu cầu thu hồi văn bằng (Revoke)
 * Yêu cầu mã giao dịch Blockchain (txHash) ghi nhận hành động thu hồi trên Smart Contract.
 */
export const revokeCertificateSchema = z.object({
  txHash: txHashSchema,
});

/**
 * Schema xác thực query parameters khi tìm kiếm và phân trang danh sách chứng chỉ
 */
export const certificateListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: certificateStatusSchema.optional(),
  type: certificateTypeSchema.optional(),
});

/** Kiểu TypeScript tĩnh cho truy vấn danh sách chứng chỉ */
export type CertificateListQuery = z.infer<typeof certificateListQuerySchema>;

/**
 * Schema mở rộng cho Quản trị viên (Admin) tìm kiếm chứng chỉ trên toàn hệ thống
 * Cho phép lọc thêm theo địa chỉ ví Issuer và năm cấp phát.
 */
export const adminCertificateListQuerySchema = certificateListQuerySchema.extend({
  issuerWallet: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^0x[a-f0-9]{40}$/)
    .optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

/** Kiểu TypeScript tĩnh cho truy vấn danh sách chứng chỉ của Quản trị viên */
export type AdminCertificateListQuery = z.infer<
  typeof adminCertificateListQuerySchema
>;

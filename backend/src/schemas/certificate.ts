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

const studentNameSchema = z
  .string()
  .min(2, "Họ tên quá ngắn")
  .max(100, "Họ tên quá dài")
  .trim();

const studentCodeSchema = z
  .string()
  .regex(/^[0-9]{6,12}$/, "MSSV phải gồm 6–12 chữ số");

const yearSchema = z.coerce
  .number()
  .int()
  .min(2000, "Năm không hợp lệ")
  .max(2100, "Năm không hợp lệ");

const gradeSchema = z.union([z.number(), z.string().min(1).max(4)]);

function validateGrade(
  gradeScale: "10" | "4" | "letter",
  grade: number | string,
  ctx: z.RefinementCtx,
  path: (string | number)[] = ["grade"]
): void {
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

  if (typeof grade !== "number") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: "Điểm phải là số",
    });
    return;
  }

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
// Details theo từng loại
// ---------------------------------------------------------------------------

export const degreeDetailsSchema = z.object({
  degreeTitle: z.string().min(2).max(50),
  major: z.string().min(2).max(100),
  graduationYear: yearSchema,
  gpa: z.number().min(0).max(4),
  classification: z.string().min(2).max(50),
  studyMode: z.string().max(50).optional(),
  thesisTitle: z.string().max(200).optional(),
});

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

export const creditModuleSchema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(2).max(150),
  credits: z.number().int().min(1).max(10),
  grade: gradeSchema,
  grade4: z.number().min(0).max(4).optional(),
});

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
// Envelope: certificateType quyết định details
// ---------------------------------------------------------------------------

const baseFields = {
  certificateId: certificateIdSchema,
  studentName: studentNameSchema,
  studentCode: studentCodeSchema,
};

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

// Alias để controller dễ đọc
export const issueCertificateSchema = confirmCertificateSchema;

export type PrepareCertificateInput = z.infer<typeof prepareCertificateSchema>;
export type ConfirmCertificateInput = z.infer<typeof confirmCertificateSchema>;

export const revokeCertificateSchema = z.object({
  txHash: txHashSchema,
});

export const certificateListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: certificateStatusSchema.optional(),
  type: certificateTypeSchema.optional(),
});

export type CertificateListQuery = z.infer<typeof certificateListQuerySchema>;

export const adminCertificateListQuerySchema = certificateListQuerySchema.extend({
  issuerWallet: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^0x[a-f0-9]{40}$/)
    .optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type AdminCertificateListQuery = z.infer<
  typeof adminCertificateListQuerySchema
>;



import { z } from "zod";
import {
  objectIdSchema,
  paginationSchema,
  txHashSchema,
  walletAddressSchema,
} from "./common";

export const createIssuerSchema = z.object({
  name: z.string().min(2, "Tên đơn vị quá ngắn").max(100),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Mã đơn vị chỉ gồm A-Z, 0-9, _ và -")
    .transform((value) => value.toUpperCase()),
  walletAddress: walletAddressSchema,
  userId: objectIdSchema.optional(),
  // Tạo tài khoản đăng nhập mới cho issuer khi không truyền userId.
  email: z
    .string()
    .email("Email không hợp lệ")
    .max(150)
    .transform((value) => value.trim().toLowerCase())
    .optional(),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(128).optional(),
  logoUrl: z.string().url().max(300).optional(),
  website: z.string().url().max(300).optional(),
  txHash: txHashSchema,
}).superRefine((value, ctx) => {
  if (!value.userId && (!value.email || !value.password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["email"],
      message: "Cần email và mật khẩu để tạo tài khoản issuer mới",
    });
  }

  if (value.userId && (value.email || value.password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["userId"],
      message: "Chỉ truyền userId hoặc email/password, không truyền cả hai",
    });
  }
});

export const issuerListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});

export const deactivateIssuerSchema = z.object({
  txHash: txHashSchema,
});

export type CreateIssuerInput = z.infer<typeof createIssuerSchema>;

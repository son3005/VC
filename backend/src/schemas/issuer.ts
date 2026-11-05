/**
 * @file issuer.ts
 * @description Định nghĩa các Schema kiểm thực và chuẩn hóa dữ liệu cho Đơn vị cấp phát chứng chỉ (Issuer Validation Schemas).
 * 
 * Các tính năng và quy tắc nghiệp vụ cốt lõi:
 * 1. Cơ chế Onboarding kép có điều kiện loại trừ lẫn nhau (Mutual Exclusivity - XOR):
 *    - Kịch bản 1: Tạo mới tài khoản người dùng cho đơn vị cấp phát -> Bắt buộc cung cấp cặp `email` và `password`.
 *    - Kịch bản 2: Liên kết đơn vị cấp phát với người dùng đã có sẵn -> Chỉ cung cấp `userId` (MongoDB ObjectId).
 *    - Quy tắc `superRefine` đảm bảo không được thiếu cả hai hoặc truyền đồng thời cả hai cách thức.
 * 2. Chuẩn hóa định danh tổ chức:
 *    - Tự động chuyển đổi mã đơn vị (`code`) sang chữ in hoa (uppercase).
 *    - Kiểm tra tính hợp lệ của địa chỉ ví Ethereum quản trị (`walletAddress`).
 * 3. Bằng chứng giao dịch Blockchain (On-chain Authorization Proof):
 *    - Yêu cầu mã băm giao dịch (`txHash`) ghi nhận hành động phân quyền trên Smart Contract khi khởi tạo hoặc vô hiệu hóa đơn vị.
 */

import { z } from "zod";
import {
  objectIdSchema,
  paginationSchema,
  txHashSchema,
  walletAddressSchema,
} from "./common";

/**
 * Schema xác thực yêu cầu tạo mới hoặc phê duyệt đơn vị cấp phát chứng chỉ (POST /api/admin/issuers)
 * 
 * Bao gồm thông tin tổ chức, liên kết tài khoản định danh, địa chỉ ví quản trị và mã giao dịch Blockchain.
 */
export const createIssuerSchema = z
  .object({
    /** Tên đầy đủ của đơn vị (ví dụ: "Khoa Công nghệ Thông tin", "Phòng Đào tạo Đại học") */
    name: z.string().min(2, "Tên đơn vị quá ngắn").max(100),

    /**
     * Mã định danh viết tắt của đơn vị:
     * - Độ dài: 2 đến 20 ký tự.
     * - Ký tự cho phép: Chữ cái, chữ số, dấu gạch dưới '_' và gạch ngang '-'.
     * - Tự động chuyển đổi sang chữ in hoa (ví dụ: "fit" -> "FIT").
     */
    code: z
      .string()
      .min(2)
      .max(20)
      .regex(/^[A-Z0-9_-]+$/, "Mã đơn vị chỉ gồm A-Z, 0-9, _ và -")
      .transform((value) => value.toUpperCase()),

    /** Địa chỉ ví Ethereum (EVM) của đơn vị cấp phát đã được thêm vào Smart Contract */
    walletAddress: walletAddressSchema,

    /** ID của người dùng đã tồn tại trong cơ sở dữ liệu (tùy chọn) */
    userId: objectIdSchema.optional(),

    /**
     * Email đăng nhập mới cho Issuer (sử dụng khi không truyền userId):
     * - Định dạng email tiêu chuẩn RFC.
     * - Tự động cắt khoảng trắng thừa và chuyển thành chữ thường.
     */
    email: z
      .string()
      .email("Email không hợp lệ")
      .max(150)
      .transform((value) => value.trim().toLowerCase())
      .optional(),

    /** Mật khẩu tài khoản mới (tối thiểu 8 ký tự, tối đa 128 ký tự chống Bcrypt DoS) */
    password: z
      .string()
      .min(8, "Mật khẩu tối thiểu 8 ký tự")
      .max(128)
      .optional(),

    /** Đường dẫn ảnh đại diện / logo chính thức của đơn vị */
    logoUrl: z.string().url().max(300).optional(),

    /** Trang thông tin điện tử (website) của đơn vị */
    website: z.string().url().max(300).optional(),

    /** Mã băm giao dịch Blockchain (Transaction Hash) ghi nhận sự kiện cấp quyền trên Smart Contract */
    txHash: txHashSchema,
  })
  .superRefine((value, ctx) => {
    // Điều kiện 1: Nếu không truyền userId, bắt buộc phải cung cấp đầy đủ cả email và password
    if (!value.userId && (!value.email || !value.password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Cần email và mật khẩu để tạo tài khoản issuer mới",
      });
    }

    // Điều kiện 2: Nếu đã truyền userId, không được phép cung cấp email hoặc password
    if (value.userId && (value.email || value.password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["userId"],
        message: "Chỉ truyền userId hoặc email/password, không truyền cả hai",
      });
    }
  });

/**
 * Schema xác thực query parameters khi tìm kiếm và phân trang danh sách Issuer
 * - `q`: Từ khóa tìm kiếm theo tên hoặc mã đơn vị.
 * - `active`: Lọc theo trạng thái hoạt động ("true" -> true, "false" -> false).
 */
export const issuerListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});

/**
 * Schema xác thực yêu cầu vô hiệu hóa (Deactivate / Revoke) quyền của đơn vị cấp phát
 * Yêu cầu mã giao dịch Blockchain (`txHash`) ghi nhận sự kiện thu hồi quyền trên Smart Contract.
 */
export const deactivateIssuerSchema = z.object({
  txHash: txHashSchema,
});

/** Kiểu TypeScript tĩnh cho dữ liệu tạo đơn vị cấp phát mới */
export type CreateIssuerInput = z.infer<typeof createIssuerSchema>;

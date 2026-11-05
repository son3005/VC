/**
 * @file auth.ts
 * @description Định nghĩa các Schema kiểm thực và chuẩn hóa dữ liệu xác thực người dùng (Authentication Validation Schemas).
 * 
 * Sử dụng thư viện Zod để:
 * 1. Đảm bảo an toàn kiểu dữ liệu từ thời điểm thực thi (Runtime Validation) đến biên dịch (Compile-time Type Safety).
 * 2. Tự động chuẩn hóa dữ liệu (Sanitization & Normalization):
 *    - Cắt tỉa khoảng trắng (trim).
 *    - Chuyển đổi chữ hoa thành chữ thường (toLowerCase) cho Email và Địa chỉ ví Ethereum (EVM Wallet).
 * 3. Ngăn chặn các lỗ hổng bảo mật:
 *    - Giới hạn độ dài tối đa chống tấn công DoS / ReDoS / bcrypt denial-of-service.
 *    - Kiểm tra cấu trúc địa chỉ ví Web3 bằng biểu thức chính quy (Regex).
 */

import { z } from "zod";

/**
 * Schema xác thực dữ liệu đầu vào cho yêu cầu đăng nhập (POST /api/auth/login)
 * 
 * Hệ thống áp dụng cơ chế định danh kép kết hợp Web2 & Web3:
 * - Email + Mật khẩu (Web2 truyền thống)
 * - Địa chỉ ví cá nhân (Web3 EVM Wallet Address)
 */
export const loginSchema = z.object({
  /**
   * Địa chỉ email đăng nhập:
   * - Bắt buộc là chuỗi ký tự.
   * - Tự động cắt khoảng trắng thừa ở hai đầu.
   * - Phải tuân theo định dạng email tiêu chuẩn RFC.
   * - Giới hạn độ dài tối đa 150 ký tự.
   * - Tự động chuyển toàn bộ ký tự thành chữ thường để đảm bảo tính duy nhất và đồng nhất khi truy vấn cơ sở dữ liệu.
   */
  email: z
    .string()
    .trim()
    .email("Email không hợp lệ")
    .max(150)
    .transform((value) => value.toLowerCase()),

  /**
   * Mật khẩu người dùng:
   * - Bắt buộc là chuỗi ký tự.
   * - Tối thiểu 8 ký tự để đảm bảo độ an toàn, chống tấn công brute-force cơ bản.
   * - Tối đa 128 ký tự để ngăn chặn DoS tiêu tốn tài nguyên CPU khi xử lý băm mật khẩu bằng thuật toán bcrypt.
   */
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(128),

  /**
   * Địa chỉ ví Ethereum (EVM Wallet Address) gắn liền với tài khoản:
   * - Bắt buộc là chuỗi ký tự.
   * - Cắt bỏ khoảng trắng thừa ở hai đầu.
   * - Kiểm tra khớp biểu thức chính quy: Bắt đầu bằng '0x' theo sau bởi đúng 40 ký tự thập lục phân (hexadecimal).
   * - Tự động chuyển thành chữ thường để trung hòa cơ chế EIP-55 checksum, giúp so khớp chính xác trong MongoDB và Web3 Provider.
   */
  walletAddress: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Địa chỉ ví không hợp lệ")
    .transform((value) => value.toLowerCase()),
});

/**
 * Kiểu TypeScript tĩnh đại diện cho dữ liệu đăng nhập sau khi đã được Zod xác thực và chuẩn hóa thành công.
 * Suy diễn tự động thông qua `z.infer<typeof loginSchema>`.
 */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * @file common.ts
 * @description Tập hợp các Schema xác thực nguyên tử (Atomic Schemas) và kiểu dữ liệu dùng chung (Common Primitives).
 * 
 * Đóng vai trò là nền tảng (Foundation Layer) cho toàn bộ hệ thống schema trong ứng dụng:
 * 1. Chuẩn hóa định dạng chuỗi Web3 & Mật mã học (EVM Address, Transaction Hash, SHA-256 File Hash, IPFS CID).
 * 2. Xác thực định dạng dữ liệu cơ sở dữ liệu (MongoDB BSON ObjectId).
 * 3. Chuẩn hóa định danh nghiệp vụ (Mã chứng chỉ UIT, phân trang an toàn).
 * 4. Định nghĩa các Enum trạng thái và phân loại văn bằng.
 */

import { z } from "zod";

/**
 * Schema xác thực địa chỉ ví Ethereum (EVM Wallet Address)
 * - Định dạng: Bắt đầu bằng tiền tố '0x' theo sau bởi đúng 40 ký tự thập lục phân (20 bytes).
 * - Chuẩn hóa (Transform): Tự động chuyển toàn bộ ký tự sang chữ thường (lowercase)
 *   để trung hòa cơ chế EIP-55 Checksum, giúp việc lưu trữ và truy vấn trong MongoDB luôn đồng nhất.
 */
export const walletAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Địa chỉ ví không hợp lệ")
  .transform((value) => value.toLowerCase());

/**
 * Schema xác thực mã băm giao dịch Blockchain (Transaction Hash)
 * - Định dạng: Bắt đầu bằng tiền tố '0x' theo sau bởi đúng 64 ký tự thập lục phân (32 bytes = 256 bits).
 * - Chuẩn hóa (Transform): Chuyển về chữ thường để đồng bộ với định dạng trả về của JSON-RPC Provider (Ethers.js/Viem).
 */
export const txHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Transaction hash không hợp lệ")
  .transform((value) => value.toLowerCase());

/**
 * Schema xác thực mã băm toàn vẹn tệp tin (File Integrity Hash)
 * - Thuật toán: SHA-256 (256-bit hash).
 * - Định dạng bắt buộc: 'sha256:<64 ký tự hex chữ thường>' (ví dụ: sha256:2cf24dba5fb0...).
 * - Đảm bảo tệp PDF văn bằng không bị can thiệp hay sửa đổi sau khi phát hành.
 */
export const fileHashSchema = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/, "File hash phải có dạng sha256:<64 hex>");

/**
 * Schema xác thực Content Identifier (CID) trên mạng lưu trữ phân tán IPFS
 * - Hỗ trợ cả hai chuẩn:
 *   + CIDv0: Bắt đầu bằng 'Qm' (46 ký tự Base58btc).
 *   + CIDv1: Bắt đầu bằng 'bafy...' (Base32/Base36, 59+ ký tự).
 * - Độ dài: Tối thiểu 10 ký tự, tối đa 100 ký tự.
 */
export const cidSchema = z
  .string()
  .min(10, "CID quá ngắn")
  .max(100, "CID quá dài");

/**
 * Schema xác thực mã định danh đối tượng MongoDB (BSON ObjectId)
 * - Định dạng: Chuỗi 24 ký tự thập lục phân (12 bytes: 4 bytes timestamp + 5 bytes random + 3 bytes counter).
 */
export const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "ObjectId không hợp lệ");

/**
 * Schema xác thực mã định danh chứng chỉ / văn bằng số (Certificate Identifier)
 * - Độ dài: Từ 6 đến 64 ký tự.
 * - Ký tự cho phép: Chữ cái in hoa A-Z, chữ số 0-9 và dấu gạch ngang '-' (ví dụ: UIT-DEG-2026-0001).
 */
export const certificateIdSchema = z
  .string()
  .min(6, "Mã chứng chỉ quá ngắn")
  .max(64, "Mã chứng chỉ quá dài")
  .regex(/^[A-Z0-9-]+$/, "Mã chứng chỉ chỉ gồm A-Z, 0-9 và dấu gạch ngang");

/**
 * Schema xác thực tham số phân trang an toàn (Safe Pagination Parameters)
 * - Tự động ép kiểu (z.coerce.number) từ chuỗi URL query sang số nguyên.
 * - `page`: Số trang hiện tại, tối thiểu là 1, giá trị mặc định là 1.
 * - `limit`: Số bản ghi trên mỗi trang, tối thiểu 1, tối đa 20, giá trị mặc định là 10.
 *   (Giới hạn tối đa 20 giúp ngăn chặn tấn công cạn kiệt bộ nhớ Server khi người dùng yêu cầu số lượng bản ghi quá lớn).
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

/**
 * Enum các định dạng lưu trữ/kết xuất của tệp chứng chỉ (Artifact Types):
 * - `pdf`: Tệp tài liệu PDF có thể tải về và in ấn.
 * - `image`: Định dạng hình ảnh (PNG / JPEG).
 * - `web`: Trang xác minh trực tuyến có thể nhúng hoặc chia sẻ qua URL.
 */
export const artifactTypeSchema = z.enum(["pdf", "image", "web"]);

/**
 * Enum trạng thái vòng đời của văn bằng chứng chỉ (Certificate Status Lifecycle):
 * - `active`: Chứng chỉ hợp lệ và đang hoạt động.
 * - `revoked`: Đã bị thu hồi vĩnh viễn trên Blockchain do sai sót hoặc vi phạm.
 * - `locked`: Tạm thời khóa để thẩm tra hoặc cập nhật thông tin.
 */
export const certificateStatusSchema = z.enum(["active", "revoked", "locked"]);

/**
 * Enum phân loại văn bằng chứng chỉ số (Certificate Types):
 * - `degree`: Bằng tốt nghiệp đại học / cử nhân / kỹ sư / thạc sĩ.
 * - `course`: Chứng chỉ hoàn thành môn học / học phần đào tạo.
 * - `credit`: Chứng chỉ tích lũy tín chỉ chuyên đề / chuyên ngành.
 * - `other`: Giấy chứng nhận ngoại khóa, hội thảo hoặc thành tích khác.
 */
export const certificateTypeSchema = z.enum([
  "degree",
  "course",
  "credit",
  "other",
]);

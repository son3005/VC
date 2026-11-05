/**
 * @file public.ts
 * @description Bộ Schema xác thực dữ liệu cho Cổng tra cứu và thẩm định công khai (Public Verification Schemas).
 * 
 * Phục vụ các đối tượng bên ngoài (sinh viên, nhà tuyển dụng, đơn vị thứ ba) tra cứu và xác thực văn bằng:
 * 1. Tra cứu đa tiêu chí (Multi-criteria Search):
 *    - Tìm kiếm theo từ khóa tổng hợp (`q`), năm cấp phát (`year`), ngành học (`major`), mã số sinh viên (`studentCode`),
 *      trạng thái văn bằng (`status`) và phân loại chứng chỉ (`type`).
 *    - Kế thừa cơ chế phân trang an toàn (`paginationSchema`) chống quá tải hệ thống.
 * 2. Tra cứu văn bằng mới phát hành gần đây (`recentQuerySchema`):
 *    - Giới hạn linh hoạt số lượng bản ghi hiển thị (từ 1 đến 12, mặc định 6).
 * 3. Thẩm định tính toàn vẹn của tệp văn bằng qua mã băm SHA-256 (`verifyQuerySchema`).
 * 4. Xác thực tham số đường dẫn URL cho mã định danh chứng chỉ (`certificateIdParamSchema`).
 */

import { z } from "zod";
import {
  certificateIdSchema,
  certificateStatusSchema,
  certificateTypeSchema,
  fileHashSchema,
  paginationSchema,
} from "./common";

/**
 * Schema xác thực query parameters cho API tra cứu văn bằng công khai (GET /api/public/certificates)
 * 
 * Mở rộng từ `paginationSchema` (hỗ trợ `page` và `limit <= 20`), bổ sung các tiêu chí lọc:
 */
export const publicSearchQuerySchema = paginationSchema.extend({
  /** Từ khóa tìm kiếm tự do (tên người học, tên chứng chỉ, mã môn học...) */
  q: z.string().trim().max(100).optional(),

  /** Năm tốt nghiệp / cấp phát văn bằng (tự động ép kiểu từ chuỗi sang số nguyên 2000–2100) */
  year: z.coerce.number().int().min(2000).max(2100).optional(),

  /** Chuyên ngành đào tạo (ví dụ: "Kỹ thuật phần mềm", "An toàn thông tin") */
  major: z.string().trim().max(100).optional(),

  /** Mã số sinh viên (MSSV) gồm 6 đến 12 chữ số */
  studentCode: z
    .string()
    .regex(/^[0-9]{6,12}$/, "MSSV không hợp lệ")
    .optional(),

  /** Trạng thái của chứng chỉ: "active", "revoked", "locked" */
  status: certificateStatusSchema.optional(),

  /** Phân loại văn bằng: "degree", "course", "credit", "other" */
  type: certificateTypeSchema.optional(),
});

/**
 * Schema xác thực query parameters cho API lấy danh sách chứng chỉ phát hành gần đây (GET /api/public/recent)
 * - `limit`: Số lượng bản ghi tối đa, từ 1 đến 12, mặc định là 6.
 */
export const recentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).default(6),
});

/**
 * Schema xác thực query parameters cho API thẩm định tính hợp lệ của file (GET /api/public/verify)
 * - `hash`: Mã băm SHA-256 của tệp PDF văn bằng (chuẩn 'sha256:<64 ký tự hex>').
 */
export const verifyQuerySchema = z.object({
  hash: fileHashSchema,
});

/**
 * Schema xác thực tham số đường dẫn URL chứa mã chứng chỉ (ví dụ: /api/public/certificates/:id)
 * - `id`: Tuân thủ chuẩn `certificateIdSchema` (A-Z, 0-9, dấu gạch ngang, 6–64 ký tự).
 * Được tái sử dụng xuyên suốt các Controllers (Public, Admin, Certificate).
 */
export const certificateIdParamSchema = z.object({
  id: certificateIdSchema,
});

/**
 * Schema xác thực bộ lọc danh mục (GET /api/public/filters)
 */
export const filtersQuerySchema = z.object({
  type: certificateTypeSchema.optional(),
});

/** Kiểu TypeScript tĩnh đại diện cho các tham số tra cứu văn bằng công khai */
export type PublicSearchQuery = z.infer<typeof publicSearchQuerySchema>;

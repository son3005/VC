import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  loginController,
  meController,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

/**
 * Express Router quản lý các tuyến đường Xác thực & Phiên làm việc (Authentication & Session).
 *
 * Tiền tố đường dẫn (Base Path): `/api/auth` (được gắn tại `backend/src/app.ts`).
 *
 * Chức năng cốt lõi:
 * 1. Đăng nhập hệ thống (POST /login): Xác thực tài khoản kết hợp đa yếu tố (Email + Mật khẩu + Địa chỉ ví).
 * 2. Lấy thông tin phiên làm việc hiện tại (GET /me): Xác thực token JWT và trả về hồ sơ người dùng.
 */
const router = Router();

/**
 * Middleware giới hạn tần suất gọi API đăng nhập (Rate Limiter).
 *
 * Biện pháp phòng vệ chống tấn công:
 * - Brute-force: Ngăn chặn dò mật khẩu tự động.
 * - Credential Stuffing: Ngăn chặn thử danh sách tài khoản bị rò rỉ trên diện rộng.
 * - Quy định: Tối đa 5 lần thử đăng nhập thất bại trong cửa sổ thời gian 1 phút (60,000ms) trên mỗi IP.
 */
const loginLimiter = rateLimit({
  windowMs: 60_000, // Cửa sổ giới hạn: 1 phút
  limit: 5, // Tối đa 5 yêu cầu / 1 phút / IP
  standardHeaders: true, // Trả về thông tin giới hạn trong headers `RateLimit-*` chuẩn RFC
  legacyHeaders: false, // Tắt các header cũ `X-RateLimit-*`
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Quá nhiều lần đăng nhập, thử lại sau 1 phút",
    },
  },
});

// -----------------------------------------------------------------------------
// ĐỊNH TUYẾN (ROUTE DEFINITIONS)
// -----------------------------------------------------------------------------

/**
 * POST /api/auth/login
 * Đăng nhập vào hệ thống dành cho Quản trị viên (Admin) và Cán bộ đơn vị cấp (Issuer):
 * - Được bảo vệ bởi `loginLimiter` chống tấn công brute-force.
 * - Yêu cầu Request Body hợp lệ theo `loginSchema`: { email, password, walletAddress }.
 * - Kiểm tra khớp cả 3 yếu tố: tài khoản tồn tại, mật khẩu bcrypt đúng và ví MetaMask khớp với hồ sơ.
 * - Trả về mã JWT Token (thời hạn 24h) và thông tin cơ bản của User (DTO).
 */
router.post("/login", loginLimiter, loginController);

/**
 * GET /api/auth/me
 * Lấy thông tin tài khoản người dùng đang đăng nhập:
 * - Được bảo vệ bởi `requireAuth`: bắt buộc gửi kèm Header `Authorization: Bearer <JWT_TOKEN>`.
 * - Giải mã JWT để lấy user id, sau đó truy vấn DB để trả về thông tin mới nhất của người dùng.
 * - Dùng để khôi phục phiên đăng nhập khi người dùng tải lại trang trên giao diện Frontend.
 */
router.get("/me", requireAuth, meController);

export { router as authRouter };

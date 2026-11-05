import { Router } from "express";
import {
  adminCertificateDetailController,
  adminCertificatesController,
  adminRevokeCertificateController,
  adminStatsController,
  syncStatusController,
  triggerSyncController,
} from "../controllers/admin.controller";
import { requireAuth, requireRole } from "../middleware/auth";

/**
 * Express Router quản lý toàn bộ các tuyến đường API dành riêng cho Quản trị viên (Admin Portal).
 *
 * Tiền tố đường dẫn (Base Path): `/api/admin` (được gắn tại `backend/src/app.ts`).
 *
 * Kiến trúc Bảo mật & Phân quyền:
 * - `requireAuth`: Bắt buộc request phải có Header `Authorization: Bearer <JWT_TOKEN>` hợp lệ.
 * - `requireRole("admin")`: Kiểm tra payload của JWT, chỉ tài khoản có vai trò `admin` mới được truy cập.
 *   Mọi truy cập từ người dùng thông thường hoặc `issuer` đều bị chặn với mã lỗi 403 Forbidden.
 */
const router = Router();

// Áp dụng middleware kiểm tra xác thực và quyền Admin toàn cục cho toàn bộ router này
router.use(requireAuth, requireRole("admin"));

// -----------------------------------------------------------------------------
// 1. DASHBOARD & THỐNG KÊ TỔNG QUAN
// -----------------------------------------------------------------------------

/**
 * GET /api/admin/stats
 * Lấy dữ liệu thống kê tổng hợp toàn hệ thống:
 * - Tổng số chứng chỉ đã phát hành
 * - Số lượng chứng chỉ theo trạng thái (active, locked, revoked)
 * - Tổng số đơn vị cấp (Issuers) đang hoạt động
 */
router.get("/stats", adminStatsController);

// -----------------------------------------------------------------------------
// 2. QUẢN LÝ VĂN BẰNG & CHỨNG CHỈ TOÀN TRƯỜNG
// -----------------------------------------------------------------------------

/**
 * GET /api/admin/certificates
 * Lấy danh sách toàn bộ chứng chỉ trên phạm vi toàn trường:
 * - Hỗ trợ lọc đa điều kiện: theo trạng thái (status), loại chứng chỉ (type), ví đơn vị cấp (issuerWallet)
 * - Hỗ trợ tìm kiếm toàn văn theo tên sinh viên, mã số sinh viên (studentCode)
 * - Phân trang dữ liệu (pagination: page, limit)
 */
router.get("/certificates", adminCertificatesController);

/**
 * GET /api/admin/certificates/:id
 * Xem thông tin chi tiết đầy đủ của một chứng chỉ cụ thể theo mã certificateId hoặc MongoDB _id:
 * - Bao gồm dữ liệu định danh PII của sinh viên, thông tin chi tiết (details)
 * - Thông tin giao dịch blockchain (txHash, blockNumber) và địa chỉ IPFS CID
 */
router.get("/certificates/:id", adminCertificateDetailController);

/**
 * POST /api/admin/certificates/:id/revoke
 * Thu hồi khẩn cấp một chứng chỉ từ cấp quản trị viên:
 * - Cho phép Admin can thiệp thu hồi chứng chỉ khi phát hiện gian lận hoặc sai sót nghiêm trọng
 * - Yêu cầu xác thực giao dịch thu hồi on-chain tương ứng
 */
router.post("/certificates/:id/revoke", adminRevokeCertificateController);

// -----------------------------------------------------------------------------
// 3. GIÁM SÁT & ĐIỀU KHIỂN TIẾN TRÌNH ĐỒNG BỘ BLOCKCHAIN (SYNC / INDEXER)
// -----------------------------------------------------------------------------

/**
 * GET /api/admin/sync/status
 * Kiểm tra trạng thái sức khỏe của tiến trình đồng bộ dữ liệu blockchain:
 * - Khối blockchain hiện tại trên mạng Sepolia (currentBlock)
 * - Khối đã đồng bộ gần nhất vào MongoDB (lastSyncedBlock)
 * - Độ trễ khối (block lag) nếu worker bị gián đoạn
 */
router.get("/sync/status", syncStatusController);

/**
 * POST /api/admin/sync
 * Kích hoạt quét và đồng bộ thủ công các sự kiện smart contract (Manual Backfill):
 * - Cho phép chỉ định khoảng khối tùy chọn: `fromBlock` đến `toBlock` trong Request Body
 * - Nếu không truyền tham số, hệ thống sẽ tự động quét từ `lastSyncedBlock + 1` đến khối mới nhất
 */
router.post("/sync", triggerSyncController);

export { router as adminRouter };

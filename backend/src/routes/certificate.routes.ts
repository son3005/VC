import { Router } from "express";
import {
  createCertificateController,
  getCertificateController,
  listCertificatesController,
  lockCertificateController,
  prepareCertificateController,
  revokeCertificateController,
  unlockCertificateController,
} from "../controllers/certificate.controller";
import { requireAuth } from "../middleware/auth";
import { requireActiveIssuer } from "../middleware/issuer";

/**
 * Express Router quản lý toàn bộ quy trình Vòng đời Văn bằng & Chứng chỉ (Certificate Lifecycle).
 *
 * Tiền tố đường dẫn (Base Path): `/api/certificates` (được gắn tại `backend/src/app.ts`).
 *
 * Kiến trúc Phân quyền & Bảo mật:
 * 1. `requireAuth`: Bắt buộc người dùng phải đăng nhập hợp lệ (có mã JWT trong Header Authorization).
 * 2. `requireActiveIssuer`: Áp dụng cho các thao tác phát hành văn bằng. Bắt buộc tài khoản phải có vai trò
 *    `issuer`, đã gắn địa chỉ ví Ethereum và cả 2 cờ `isActive` (DB) lẫn `onChainActive` (hợp đồng) đều đang bật.
 * 3. Phân quyền theo Chủ thể (Actor-based Authorization): Với các thao tác tra cứu chi tiết, tạm khóa,
 *    mở khóa và thu hồi, Service kiểm tra thẩm quyền: chỉ Issuer đã cấp chứng chỉ đó hoặc Admin hệ thống mới được phép.
 */
const router = Router();

// Toàn bộ các tuyến đường trong router này bắt buộc phải đăng nhập
router.use(requireAuth);

// -----------------------------------------------------------------------------
// 1. NGHIỆP VỤ PHÁT HÀNH VĂN BẰNG (DÀNH CHO ISSUER ĐANG HOẠT ĐỘNG)
// -----------------------------------------------------------------------------

/**
 * GET /api/certificates
 * Lấy danh sách văn bằng do chính đơn vị cấp của người dùng phát hành:
 * - Hỗ trợ lọc theo trạng thái (status), loại chứng chỉ (type), năm tốt nghiệp (graduationYear)
 * - Hỗ trợ tìm kiếm theo tên hoặc mã sinh viên (search)
 * - Phân trang dữ liệu (pagination: page, limit)
 */
router.get("/", requireActiveIssuer, listCertificatesController);

/**
 * POST /api/certificates/prepare
 * Bước 1 & 2 trong quy trình cấp bằng (Chuẩn bị dữ liệu & Artifact):
 * - Nhận thông tin sinh viên và văn bằng từ form giao diện (validate qua `prepareCertificateSchema`)
 * - Sinh mã định danh chứng chỉ duy nhất (certificateId)
 * - Tạo file PDF hoàn chỉnh bằng PDFKit (song ngữ, kèm QR code và con dấu điện tử)
 * - Tính mã băm SHA-256 của file PDF và ghim (pin) file lên mạng phân tán IPFS qua Pinata
 * - Trả về `fileHash`, `ipfsCid`, `certificateId` để Frontend sẵn sàng ký giao dịch bằng MetaMask
 */
router.post("/prepare", requireActiveIssuer, prepareCertificateController);

/**
 * POST /api/certificates/confirm (hoặc POST /api/certificates)
 * Bước 4 trong quy trình cấp bằng (Xác nhận lưu cơ sở dữ liệu sau khi ký on-chain):
 * - Frontend gửi thông tin đã prepare kèm theo mã giao dịch `txHash` vừa ký thành công qua MetaMask
 * - Backend kiểm tra giao dịch trên Ethereum Sepolia để xác thực event `CertificateIssued` đã phát ra
 * - Lưu bản ghi đầy đủ vào MongoDB và trả về dữ liệu chứng chỉ đã tạo thành công
 */
router.post("/confirm", requireActiveIssuer, createCertificateController);
router.post("/", requireActiveIssuer, createCertificateController);

// -----------------------------------------------------------------------------
// 2. QUẢN LÝ VÒNG ĐỜI TRẠNG THÁI VĂN BẰNG (ACTOR-BASED: ISSUER SỞ HỮU HOẶC ADMIN)
// -----------------------------------------------------------------------------

/**
 * GET /api/certificates/:id
 * Xem thông tin chi tiết đầy đủ của một chứng chỉ:
 * - Issuer chỉ xem được chứng chỉ do đơn vị mình phát hành
 * - Admin có quyền xem chứng chỉ của bất kỳ đơn vị nào
 */
router.get("/:id", getCertificateController);

/**
 * POST /api/certificates/:id/revoke
 * Thu hồi vĩnh viễn một văn bằng (sau khi đã ký `revokeCertificate` on-chain):
 * - Thẩm quyền: Chỉ chính Issuer đã phát hành chứng chỉ hoặc Quản trị viên trường học (Admin)
 * - Cập nhật trạng thái `revoked`, lưu vết `revokeTxHash` và thời điểm thu hồi
 */
router.post("/:id/revoke", revokeCertificateController);

/**
 * POST /api/certificates/:id/lock
 * Tạm khóa một văn bằng đang hợp lệ để chờ xác minh/điều tra khiếu nại sai sót:
 * - Thẩm quyền: Chỉ chính Issuer đã phát hành chứng chỉ
 * - Yêu cầu mã giao dịch gọi hàm `lockCertificate` trên smart contract
 * - Cập nhật trạng thái `locked`, lưu vết `lockTxHash`
 */
router.post("/:id/lock", lockCertificateController);

/**
 * POST /api/certificates/:id/unlock
 * Mở khóa văn bằng, đưa chứng chỉ trở lại trạng thái hợp lệ (`active`):
 * - Thẩm quyền: Issuer đã cấp hoặc Admin hệ thống (xử lý sự cố khẩn cấp)
 * - Yêu cầu mã giao dịch gọi hàm `unlockCertificate` trên smart contract
 */
router.post("/:id/unlock", unlockCertificateController);

export { router as certificateRouter };

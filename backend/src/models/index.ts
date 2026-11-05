/**
 * Điểm xuất khẩu tập trung (Barrel Module) cho toàn bộ lớp Mô hình Dữ liệu (Data Layer / ODM) của Backend.
 *
 * Tệp tin này gom nhóm và tái xuất khẩu (re-export) tất cả các Mongoose Model, Interface dữ liệu,
 * Hydrated Document type và Type alias từ các mô hình thành phần:
 *
 * 1. User: Quản lý người dùng, phân quyền (admin / issuer), mật khẩu băm và liên kết ví MetaMask.
 * 2. Issuer: Hồ sơ đơn vị cấp văn bằng (Khoa, Viện, Phòng ban), thông tin liên hệ và trạng thái cấp phép on-chain.
 * 3. Certificate: Thực thể trung tâm lưu trữ văn bằng, thông tin sinh viên (PII), mã hash SHA-256 của file PDF, CID IPFS và các cờ trạng thái.
 * 4. ChainEvent: Nhật ký kiểm toán (Audit Trail) lưu vết thô bất biến các sự kiện phát ra từ smart contract, bảo đảm tính lũy thừa (Idempotency).
 * 5. SyncState: Con trỏ trạng thái theo dõi khối blockchain đã quét (lastSyncedBlock) phục vụ worker đồng bộ sự kiện nền.
 */

// --- Quản trị viên & Người dùng hệ thống ---
export {
  User,
  type IUser,
  type UserDocument,
  type UserRole,
} from "./User";

// --- Đơn vị cấp văn bằng / chứng chỉ (Khoa, Viện) ---
export {
  Issuer,
  type IIssuer,
  type IssuerDocument,
} from "./Issuer";

// --- Văn bằng, Chứng chỉ & Hồ sơ học viên ---
export {
  Certificate,
  type ICertificate,
  type CertificateDocument,
} from "./Certificate";

// --- Sự kiện Blockchain & Nhật ký kiểm toán Idempotency ---
export {
  ChainEvent,
  type IChainEvent,
  type ChainEventDocument,
  type ChainEventType,
} from "./ChainEvent";

// --- Trạng thái tiến trình đồng bộ khối Blockchain ---
export {
  SyncState,
  type ISyncState,
  type SyncStateDocument,
} from "./SyncState";

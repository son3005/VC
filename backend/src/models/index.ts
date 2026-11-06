/**
 * @file index.ts
 * @description Điểm xuất khẩu tập trung (Barrel Pattern) cho toàn bộ lớp Mô hình Dữ liệu (ODM / Data Layer) của Backend.
 *
 * Gom nhóm và tái xuất khẩu (re-export) tất cả các Mongoose Model, Interface,
 * Hydrated Document type và Type alias từ các thực thể cơ sở dữ liệu:
 *
 * 1. User: Quản lý tài khoản, vai trò (admin / issuer), mật khẩu mã hóa và liên kết ví Web3.
 * 2. Issuer: Hồ sơ đơn vị cấp văn bằng (Khoa, Viện, Trường), trạng thái ủy quyền và đồng bộ on-chain.
 * 3. Certificate: Thực thể trung tâm lưu trữ văn bằng, thông tin sinh viên (PII), hash PDF và CID IPFS.
 * 4. ChainEvent: Nhật ký kiểm toán (Audit Trail) lưu vết sự kiện smart contract, bảo đảm tính lũy thừa (Idempotency).
 * 5. SyncState: Con trỏ checkpoint theo dõi khối chuỗi khối đã quét (lastSyncedBlock) phục vụ bộ lập chỉ mục sự kiện.
 */

// --- Quản trị viên & Người dùng hệ thống (User Model) ---
export {
  User,
  type IUser,
  type UserDocument,
  type UserRole,
} from "./User";

// --- Đơn vị cấp văn bằng / chứng chỉ (Issuer Model) ---
export {
  Issuer,
  type IIssuer,
  type IssuerDocument,
} from "./Issuer";

// --- Văn bằng, Chứng chỉ & Hồ sơ người học (Certificate Model) ---
export {
  Certificate,
  type ICertificate,
  type CertificateDocument,
} from "./Certificate";

// --- Sự kiện Blockchain & Nhật ký kiểm toán Idempotency (ChainEvent Model) ---
export {
  ChainEvent,
  type IChainEvent,
  type ChainEventDocument,
  type ChainEventType,
} from "./ChainEvent";

// --- Trạng thái tiến trình đồng bộ khối Blockchain (SyncState Model) ---
export {
  SyncState,
  type ISyncState,
  type SyncStateDocument,
} from "./SyncState";

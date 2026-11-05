import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";

/**
 * Interface định nghĩa dữ liệu của một Đơn vị cấp văn bằng/chứng chỉ (Issuer) trong MongoDB.
 *
 * Đơn vị cấp đại diện cho một Khoa, Viện hoặc Phòng ban trong trường đại học được ủy quyền cấp bằng:
 * - Liên kết địa chỉ ví Web3 (walletAddress) dùng để ký giao dịch `issueCertificate` trên blockchain Sepolia.
 * - Liên kết tùy chọn với một tài khoản người dùng (User) để đăng nhập và quản lý qua giao diện portal.
 * - Duy trì cơ chế trạng thái kép (Dual Status): `isActive` (quản trị ứng dụng) và `onChainActive` (trạng thái hợp đồng).
 */
export interface IIssuer {
  /** Tên đầy đủ của đơn vị cấp (VD: "Khoa Công nghệ Thông tin", "Phòng Đào tạo Đại học") */
  name: string;
  /** Mã viết tắt duy nhất của đơn vị (VD: "FIT", "OAA", "FEE"), chuẩn hóa viết hoa */
  code: string;
  /** Địa chỉ ví Ethereum (checksum/lowercase) của đơn vị được cấp quyền trên Smart Contract */
  walletAddress: string;
  /** ID tài khoản User liên kết trong MongoDB (nếu đơn vị có tài khoản đăng nhập riêng) */
  userId?: Types.ObjectId | null;
  /** Đường dẫn URL hình ảnh logo của đơn vị cấp */
  logoUrl?: string | null;
  /** Địa chỉ trang web hoặc cổng thông tin chính thức của đơn vị */
  website?: string | null;
  /** Trạng thái kích hoạt off-chain trong cơ sở dữ liệu (Admin có thể tạm vô hiệu hóa) */
  isActive: boolean;
  /** Trạng thái kích hoạt thực tế on-chain đọc từ smart contract CertificateRegistry */
  onChainActive: boolean;
  /** Thời điểm đơn vị được cấp quyền lần đầu trên blockchain (Unix timestamp chuyển thành Date) */
  chainAddedAt?: Date | null;
  /** Thời điểm bản ghi được tạo trong MongoDB */
  createdAt: Date;
  /** Thời điểm bản ghi được cập nhật gần nhất */
  updatedAt: Date;
}

export type IssuerDocument = HydratedDocument<IIssuer>;

/**
 * Mongoose Schema định nghĩa cấu trúc, quy chuẩn và ràng buộc cho Issuer.
 */
const issuerSchema = new Schema<IIssuer>(
  {
    // Tên đơn vị cấp chứng chỉ
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    // Mã định danh đơn vị (viết hoa, chỉ gồm chữ cái, số, gạch dưới và gạch nối)
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
      match: /^[A-Z0-9_-]+$/,
    },
    // Địa chỉ ví Ethereum (40 ký tự hex, lưu trữ dạng chữ thường)
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: /^0x[a-f0-9]{40}$/,
    },
    // Khóa ngoại liên kết 1-1 tùy chọn tới bảng User
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Đường dẫn logo phục vụ hiển thị trên giao diện và văn bằng
    logoUrl: {
      type: String,
      default: null,
      maxlength: 300,
    },
    // Website chính thức của khoa/phòng ban
    website: {
      type: String,
      default: null,
      maxlength: 300,
    },
    // Cờ trạng thái quản trị off-chain trong ứng dụng
    isActive: {
      type: Boolean,
      default: true,
    },
    // Cờ trạng thái thực tế trên Smart Contract (đồng bộ tự động qua worker)
    onChainActive: {
      type: Boolean,
      default: false,
    },
    // Thời điểm smart contract ghi nhận ví này trở thành issuer
    chainAddedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Tự động tạo createdAt và updatedAt
    versionKey: false, // Bỏ trường __v
  }
);

// -----------------------------------------------------------------------------
// CHIẾN LƯỢC ĐÁNH CHỈ MỤC (INDEXING STRATEGY)
// -----------------------------------------------------------------------------

// 1. Chỉ mục Unique theo mã code: Đảm bảo không trùng mã viết tắt giữa các khoa/viện
issuerSchema.index({ code: 1 }, { unique: true });

// 2. Chỉ mục Unique theo ví Ethereum: Mỗi địa chỉ ví chỉ đại diện cho một đơn vị duy nhất
issuerSchema.index({ walletAddress: 1 }, { unique: true });

// 3. Chỉ mục Unique có điều kiện (Partial Filter Index) cho liên kết tài khoản:
// Đảm bảo mỗi User chỉ liên kết với tối đa 1 Issuer, đồng thời cho phép nhiều Issuer có userId = null
issuerSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $type: "objectId" } },
  }
);

export const Issuer: Model<IIssuer> = model<IIssuer>("Issuer", issuerSchema);

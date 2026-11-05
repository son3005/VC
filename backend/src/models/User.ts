import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
} from "mongoose";

/**
 * Vai trò người dùng trong hệ thống:
 * - admin: Quản trị viên trường học (quản lý danh sách issuer, xem toàn bộ chứng chỉ, thu hồi khẩn cấp).
 * - issuer: Cán bộ đại diện cho khoa/viện có thẩm quyền tạo và ký cấp phát hành văn bằng.
 */
export type UserRole = "admin" | "issuer";

/**
 * Interface định nghĩa dữ liệu tài khoản Người dùng (User) trong MongoDB.
 *
 * Mô hình này quản lý danh tính, phân quyền và cơ chế xác thực kết hợp Web2 + Web3:
 * - Đăng nhập truyền thống: Email + Mật khẩu băm (bcrypt).
 * - Xác thực kết hợp Web3: Liên kết địa chỉ ví Ethereum (walletAddress). Khi đăng nhập, ví kết nối
 *   phải khớp chính xác với ví đã đăng ký của tài khoản.
 * - Bảo mật thông tin: Mật khẩu băm được ẩn mặc định (select: false) và tự động xóa khi serialize JSON.
 */
export interface IUser {
  /** Địa chỉ email đăng nhập duy nhất của người dùng */
  email: string;
  /** Mật khẩu đã băm an toàn bằng thuật toán bcryptjs (ẩn mặc định khi truy vấn) */
  passwordHash: string;
  /** Quyền hạn của người dùng trong hệ thống (admin | issuer) */
  role: UserRole;
  /** Tên hiển thị của người dùng (VD: "Phòng Quản lý Đào tạo", "Khoa CNTT") */
  displayName: string;
  /** Địa chỉ ví Ethereum liên kết với tài khoản (chữ thường, dùng đối soát đăng nhập Web3) */
  walletAddress?: string | null;
  /** Trạng thái hoạt động của tài khoản (true: cho phép đăng nhập, false: bị khóa) */
  isActive: boolean;
  /** Thời điểm đăng nhập thành công gần nhất */
  lastLoginAt?: Date | null;
  /** Thời điểm tạo tài khoản */
  createdAt: Date;
  /** Thời điểm cập nhật thông tin tài khoản gần nhất */
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

/**
 * Mongoose Schema định nghĩa cấu trúc, bảo mật và ràng buộc cho User.
 */
const userSchema = new Schema<IUser>(
  {
    // Địa chỉ email chuẩn hóa viết thường, kiểm tra regex định dạng email
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 150,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    // Mật khẩu băm: select: false để không bao giờ vô tình trả về hash mật khẩu trong API queries
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    // Vai trò người dùng: chỉ cho phép 2 quyền chuẩn
    role: {
      type: String,
      required: true,
      enum: ["admin", "issuer"],
    },
    // Tên hiển thị người dùng
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    // Địa chỉ ví Ethereum liên kết (tùy chọn, viết thường 40 ký tự hex)
    walletAddress: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    // Cờ trạng thái cho phép đăng nhập
    isActive: {
      type: Boolean,
      default: true,
    },
    // Lưu vết thời điểm đăng nhập gần nhất
    lastLoginAt: {
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

// 1. Chỉ mục Unique theo Email: Đảm bảo không thể đăng ký trùng email
userSchema.index({ email: 1 }, { unique: true });

// 2. Chỉ mục Unique có điều kiện (Partial Filter Index) theo ví Ethereum:
// Đảm bảo mỗi địa chỉ ví chỉ gắn với 1 tài khoản User, nhưng cho phép nhiều User có walletAddress = null
userSchema.index(
  { walletAddress: 1 },
  {
    unique: true,
    partialFilterExpression: { walletAddress: { $type: "string" } },
  }
);

// -----------------------------------------------------------------------------
// HOOKS & TRANSFORMS BẢO MẬT
// -----------------------------------------------------------------------------

// Tự động xóa passwordHash khi document được chuyển đổi sang đối tượng JSON
// Ngăn chặn hoàn toàn việc rò rỉ hash mật khẩu ra các response API của client
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete (ret as { passwordHash?: string }).passwordHash;
    return ret;
  },
});

export const User: Model<IUser> = model<IUser>("User", userSchema);

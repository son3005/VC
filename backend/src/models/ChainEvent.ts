/**
 * @file ChainEvent.ts
 * @description Mô hình dữ liệu Mongoose cho Nhật ký sự kiện Blockchain (ChainEvent Model).
 * Đóng vai trò là sổ lưu vết bất biến (Audit Trail), hỗ trợ Event Sourcing và đảm bảo tính lũy thừa (Idempotency).
 */

import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
} from "mongoose";

/**
 * Các loại sự kiện (Event) được phát ra từ Smart Contract CertificateRegistry trên blockchain:
 * - CertificateIssued: Đơn vị cấp phát hành một văn bằng mới.
 * - CertificateRevoked: Văn bằng bị thu hồi vĩnh viễn (bởi Issuer hoặc Owner).
 * - CertificateLocked: Văn bằng bị tạm khóa phục vụ điều tra sai sót.
 * - CertificateUnlocked: Văn bằng được gỡ khóa trở lại trạng thái hợp lệ.
 * - IssuerUpdated: Đơn vị cấp được thêm mới, kích hoạt lại hoặc vô hiệu hóa quyền cấp.
 * - OwnershipTransferred: Quyền quản trị viên hợp đồng được chuyển giao.
 */
export type ChainEventType =
  | "CertificateIssued"
  | "CertificateRevoked"
  | "CertificateLocked"
  | "CertificateUnlocked"
  | "IssuerUpdated"
  | "OwnershipTransferred";

/**
 * Interface định nghĩa dữ liệu của một sự kiện Blockchain đã được lưu vết trong MongoDB.
 *
 * Mô hình này hoạt động như một Audit Trail (Nhật ký kiểm toán) và Idempotency Store:
 * - Lưu giữ toàn bộ lịch sử thô (raw events) của smart contract để truy vết và phục hồi dữ liệu khi cần.
 * - Đảm bảo tính lũy thừa (Idempotency): mỗi event chỉ được xử lý đúng một lần duy nhất.
 */
export interface IChainEvent {
  /** Mã băm giao dịch Ethereum (32 bytes hex bắt đầu bằng 0x) */
  txHash: string;
  /** Vị trí (index) của log event trong giao dịch, phân biệt các event phát ra trong cùng một tx */
  logIndex: number;
  /** Số hiệu khối (block number) trên blockchain chứa sự kiện */
  blockNumber: number;
  /** Tên sự kiện smart contract tương ứng */
  eventType: ChainEventType;
  /** Dữ liệu chi tiết của sự kiện (các đối số arguments đã được giải mã từ ABI) */
  payload: Record<string, unknown>;
  /** Địa chỉ hợp đồng thông minh phát ra sự kiện */
  contractAddress: string;
  /** Thời điểm backend xử lý và lưu sự kiện vào cơ sở dữ liệu */
  processedAt: Date;
  /** Thời điểm bản ghi được tạo trong MongoDB */
  createdAt: Date;
}

/** Kiểu Document Mongoose đại diện cho một bản ghi IChainEvent */
export type ChainEventDocument = HydratedDocument<IChainEvent>;

/**
 * Mongoose Schema định nghĩa cấu trúc và ràng buộc cho ChainEvent.
 */
const chainEventSchema = new Schema<IChainEvent>(
  {
    // Hash giao dịch trên blockchain, viết thường và đúng định dạng 64 ký tự hex
    txHash: {
      type: String,
      required: true,
      lowercase: true,
      match: /^0x[a-f0-9]{64}$/,
    },
    // Vị trí của event log trong giao dịch
    logIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    // Số thứ tự khối chứa giao dịch
    blockNumber: {
      type: Number,
      required: true,
      min: 0,
    },
    // Loại sự kiện phát ra từ smart contract
    eventType: {
      type: String,
      required: true,
      enum: [
        "CertificateIssued",
        "CertificateRevoked",
        "CertificateLocked",
        "CertificateUnlocked",
        "IssuerUpdated",
        "OwnershipTransferred",
      ],
    },
    // Dữ liệu giải mã của event (JSON linh hoạt lưu trữ các tham số của sự kiện)
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    // Địa chỉ hợp đồng thông minh phát ra event (20 bytes hex)
    contractAddress: {
      type: String,
      required: true,
      lowercase: true,
      match: /^0x[a-f0-9]{40}$/,
    },
    // Thời điểm backend hoàn thành việc xử lý nghiệp vụ của event
    processedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    // Sự kiện blockchain là bất biến (append-only), chỉ cần createdAt, không có updatedAt
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

// -----------------------------------------------------------------------------
// CHIẾN LƯỢC ĐÁNH CHỈ MỤC (INDEXING STRATEGY)
// -----------------------------------------------------------------------------

// 1. Chỉ mục Unique phức hợp: Đảm bảo tính lũy thừa (Idempotency)
// Cặp (txHash, logIndex) là định danh duy nhất trên toàn mạng Ethereum cho từng event log.
// Ngăn chặn hoàn toàn việc xử lý lại một sự kiện khi backfill hoặc quét lại các block cũ.
chainEventSchema.index({ txHash: 1, logIndex: 1 }, { unique: true });

// 2. Chỉ mục theo khối: Phục vụ tra cứu, phân đoạn và kiểm toán theo khoảng block
chainEventSchema.index({ blockNumber: 1 });

// 3. Chỉ mục kép: Phục vụ truy vấn lịch sử theo loại sự kiện, sắp xếp theo block mới nhất
chainEventSchema.index({ eventType: 1, blockNumber: -1 });

/** Model Mongoose ChainEvent dùng để thao tác với collection chain_events */
export const ChainEvent: Model<IChainEvent> = model<IChainEvent>(
  "ChainEvent",
  chainEventSchema
);

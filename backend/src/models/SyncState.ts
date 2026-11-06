/**
 * @file SyncState.ts
 * @description Mô hình dữ liệu Mongoose cho Trạng thái đồng bộ chuỗi khối (SyncState Model).
 * Lưu trữ con trỏ kiểm soát (Checkpoint / High-Water Mark) theo dõi tiến độ quét sự kiện từ Ethereum về MongoDB.
 */

import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
} from "mongoose";

/**
 * Interface định nghĩa dữ liệu trạng thái đồng bộ khối Blockchain (Sync Checkpoint / Watermark).
 *
 * Mô hình này lưu trữ tiến trình quét sự kiện smart contract từ mạng Ethereum Sepolia vào MongoDB:
 * - Lưu số hiệu khối cao nhất đã quét và đồng bộ thành công (lastSyncedBlock).
 * - Khi backend khởi động lại, worker nền sẽ đọc mốc này để tiếp tục quét khối mới mà không cần quét lại từ đầu.
 * - Giảm tải số lượng yêu cầu gọi RPC lên mạng Ethereum, tối ưu chi phí và tăng tốc độ khởi động hệ thống.
 */
export interface ISyncState {
  /** Tên định danh tiến trình đồng bộ (VD: "certificate_registry"), duy nhất trên toàn hệ thống */
  key: string;
  /** Chain ID của mạng blockchain đang theo dõi (VD: 11155111 ứng với Ethereum Sepolia) */
  chainId: number;
  /** Địa chỉ smart contract được quét sự kiện (dạng 20 bytes hex chữ thường) */
  contractAddress: string;
  /** Số hiệu khối (block number) cao nhất đã được quét và xử lý thành công */
  lastSyncedBlock: number;
  /** Thời điểm bản ghi được tạo trong MongoDB */
  createdAt: Date;
  /** Thời điểm cập nhật mốc khối gần nhất */
  updatedAt: Date;
}

/** Kiểu HydratedDocument của Mongoose đại diện cho một bản ghi SyncState */
export type SyncStateDocument = HydratedDocument<ISyncState>;

/**
 * Mongoose Schema định nghĩa cấu trúc và ràng buộc cho SyncState.
 */
const syncStateSchema = new Schema<ISyncState>(
  {
    // Khóa định danh tiến trình đồng bộ (VD: "certificate_registry")
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    // ID mạng blockchain (Sepolia = 11155111, Mainnet = 1)
    chainId: {
      type: Number,
      required: true,
      min: 1,
    },
    // Địa chỉ hợp đồng thông minh CertificateRegistry (40 ký tự hex bắt đầu bằng 0x)
    contractAddress: {
      type: String,
      required: true,
      lowercase: true,
      match: /^0x[a-f0-9]{40}$/,
    },
    // Khối blockchain cuối cùng đã đồng bộ xong dữ liệu
    lastSyncedBlock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true, // Tự động cập nhật createdAt và updatedAt mỗi khi lưu mốc block mới
    versionKey: false, // Bỏ trường __v không cần thiết
  }
);

// -----------------------------------------------------------------------------
// CHIẾN LƯỢC ĐÁNH CHỈ MỤC (INDEXING STRATEGY)
// -----------------------------------------------------------------------------

// Chỉ mục Unique theo khóa định danh: Đảm bảo mỗi tiến trình đồng bộ chỉ có đúng 1 con trỏ trạng thái duy nhất
syncStateSchema.index({ key: 1 }, { unique: true });

/** Model Mongoose SyncState dùng để thao tác với bộ sưu tập sync_states */
export const SyncState: Model<ISyncState> = model<ISyncState>(
  "SyncState",
  syncStateSchema
);

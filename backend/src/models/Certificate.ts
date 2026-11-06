/**
 * @file Certificate.ts
 * @description Mô hình dữ liệu Mongoose cho Văn bằng / Chứng chỉ số (Certificate Model).
 * Quản lý siêu dữ liệu off-chain, thông tin định danh sinh viên (PII), liên kết IPFS và dữ liệu neo Blockchain.
 */

import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import type {
  ArtifactType,
  CertificateDetails,
  CertificateStatus,
  CertificateType,
} from "../types/certificate";

/**
 * Interface định nghĩa cấu trúc dữ liệu của một chứng chỉ/văn bằng lưu trữ trong MongoDB.
 *
 * Mô hình này là lớp off-chain lưu trữ song song với smart contract on-chain:
 * - Dữ liệu PII (tên sinh viên, MSSV, GPA, ngành học) được lưu tại đây để bảo vệ quyền riêng tư.
 * - Các giá trị băm (fileHash, ipfsCid, txHash) dùng để đối soát và bảo đảm tính toàn vẹn với blockchain.
 */
export interface ICertificate {
  // --- Định danh & Loại văn bằng ---
  /** Mã chứng chỉ công khai (VD: "UIT-DEG-2026-0001"), duy nhất trên toàn hệ thống */
  certificateId: string;
  /** Keccak-256 hash của certificateId dạng hex (0x...), dùng để tra cứu nhanh theo event on-chain */
  certificateIdHash?: string | null;
  /** Loại chứng chỉ: degree (văn bằng), course (khóa học), credit (tín chỉ), other (khác) */
  certificateType: CertificateType;
  /** Chi tiết mở rộng phụ thuộc vào loại chứng chỉ (VD: số tín chỉ, danh sách môn, xếp loại,...) */
  details: CertificateDetails;

  // --- Mẫu phôi chứng chỉ ---
  /** Mã định danh mẫu giao diện phôi văn bằng */
  templateId: string;
  /** Phiên bản của mẫu phôi văn bằng */
  templateVersion: string;

  // --- File artifact & Lưu trữ IPFS ---
  /** Mã băm SHA-256 của file PDF gốc ("sha256:<64 hex chars>"), dùng đối soát với on-chain */
  fileHash: string;
  /** Content Identifier (CID) của file PDF lưu trên mạng IPFS (Pinata) */
  ipfsCid: string;
  /** Định dạng artifact gốc (pdf, image, web) */
  artifactType: ArtifactType;
  /** MIME type của file (thường là "application/pdf") */
  mimeType: string;
  /** Tên file khi tải về (VD: "UIT-DEG-2026-0001.pdf") */
  filename: string;
  /** Kích thước file tính theo bytes */
  sizeBytes: number;
  /** CID ảnh thumbnail/preview (nếu có) */
  previewCid?: string | null;

  // --- Đơn vị cấp (Issuer) ---
  /** ObjectId liên kết tới bảng Issuer trong MongoDB */
  issuerId: Types.ObjectId;
  /** Địa chỉ ví Ethereum (checksum/lowercase) của đơn vị cấp chứng chỉ */
  issuerWallet: string;
  /** Tên đơn vị cấp chứng chỉ tại thời điểm cấp (VD: "Khoa Công nghệ Thông tin") */
  issuerName: string;

  // --- Thông tin người nhận & PII (Chỉ lưu Off-chain) ---
  /** Họ tên đầy đủ có dấu của sinh viên */
  studentName: string;
  /** Họ tên đã chuẩn hóa (bỏ dấu tiếng Việt, viết thường) phục vụ tìm kiếm không dấu */
  studentNameNormalized: string;
  /** Mã số sinh viên (6-12 chữ số) */
  studentCode: string;
  /** Chuyên ngành đào tạo có dấu */
  major?: string | null;
  /** Chuyên ngành đào tạo đã chuẩn hóa không dấu phục vụ tìm kiếm và lọc */
  majorNormalized?: string | null;
  /** Năm tốt nghiệp */
  graduationYear?: number | null;
  /** Điểm trung bình tích lũy thang 4.0 */
  gpa?: number | null;
  /** Xếp loại tốt nghiệp (Xuất sắc, Giỏi, Khá,...) */
  classification?: string | null;

  // --- Giao dịch cấp On-chain (Blockchain Anchor) ---
  /** Thời điểm cấp văn bằng (ghi nhận theo block.timestamp của Ethereum) */
  issuedAt: Date;
  /** Hash giao dịch gọi hàm issueCertificate trên Ethereum Sepolia */
  txHash: string;
  /** Số hiệu khối chứa giao dịch cấp văn bằng */
  blockNumber: number;
  /** Thứ tự vị trí log event CertificateIssued trong khối */
  logIndex: number;

  // --- Trạng thái văn bằng & Vòng đời ---
  /** Trạng thái hiện tại: active (hợp lệ), revoked (thu hồi vĩnh viễn), locked (tạm khóa) */
  status: CertificateStatus;
  /** Thời điểm bị thu hồi (nếu có) */
  revokedAt?: Date | null;
  /** Hash giao dịch thu hồi trên blockchain */
  revokeTxHash?: string | null;
  /** Số hiệu khối của giao dịch thu hồi */
  revokeBlockNumber?: number | null;

  // --- Thông tin tạm khóa (Locking) ---
  /** Thời điểm bị tạm khóa phục vụ điều tra sai sót */
  lockedAt?: Date | null;
  /** Hash giao dịch gọi hàm lockCertificate */
  lockTxHash?: string | null;
  /** Số hiệu khối của giao dịch khóa */
  lockBlockNumber?: number | null;

  // --- Toàn vẹn metadata ---
  /** Mã hash SHA-256 của toàn bộ metadata JSON */
  metadataHash?: string | null;

  // --- Timestamps ---
  /** Thời điểm bản ghi được tạo trong MongoDB */
  createdAt: Date;
  /** Thời điểm bản ghi được cập nhật gần nhất */
  updatedAt: Date;
}

/** Kiểu Document Mongoose đại diện cho một bản ghi ICertificate */
export type CertificateDocument = HydratedDocument<ICertificate>;

/**
 * Mongoose Schema định nghĩa cấu trúc và ràng buộc dữ liệu cho Certificate.
 */
const certificateSchema = new Schema<ICertificate>(
  {
    // --- Định danh văn bằng ---
    certificateId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
      match: /^[A-Z0-9-]+$/, // Chỉ cho phép ký tự in hoa, số và dấu gạch ngang
    },
    certificateIdHash: {
      type: String,
      default: null,
      lowercase: true,
      match: /^0x[a-f0-9]{64}$/, // Keccak-256 hash dạng 32 bytes hex
    },
    certificateType: {
      type: String,
      required: true,
      enum: ["degree", "course", "credit", "other"],
    },
    details: {
      type: Schema.Types.Mixed,
      required: true,
    },

    // --- Mẫu phôi văn bằng ---
    templateId: {
      type: String,
      required: true,
      maxlength: 40,
    },
    templateVersion: {
      type: String,
      required: true,
      maxlength: 20,
    },

    // --- File artifact & Lưu trữ IPFS ---
    fileHash: {
      type: String,
      required: true,
      match: /^sha256:[a-f0-9]{64}$/, // Bắt buộc tiền tố "sha256:" và 64 ký tự hex
    },
    ipfsCid: {
      type: String,
      required: true,
      maxlength: 100,
    },
    artifactType: {
      type: String,
      required: true,
      enum: ["pdf", "image", "web"],
      default: "pdf",
    },
    mimeType: {
      type: String,
      required: true,
      maxlength: 100,
    },
    filename: {
      type: String,
      required: true,
      maxlength: 120,
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 1,
    },
    previewCid: {
      type: String,
      default: null,
      maxlength: 100,
    },

    // --- Đơn vị cấp ---
    issuerId: {
      type: Schema.Types.ObjectId,
      ref: "Issuer",
      required: true,
    },
    issuerWallet: {
      type: String,
      required: true,
      lowercase: true,
      match: /^0x[a-f0-9]{40}$/, // Định dạng địa chỉ ví Ethereum 20 bytes hex
    },
    issuerName: {
      type: String,
      required: true,
      maxlength: 100,
    },

    // --- Thông tin sinh viên & Học tập ---
    studentName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    studentNameNormalized: {
      type: String,
      required: true,
      maxlength: 100,
    },
    studentCode: {
      type: String,
      required: true,
      match: /^[0-9]{6,12}$/, // Mã sinh viên gồm 6 đến 12 số
    },
    major: {
      type: String,
      default: null,
      maxlength: 100,
    },
    majorNormalized: {
      type: String,
      default: null,
      maxlength: 100,
    },
    graduationYear: {
      type: Number,
      default: null,
      min: 2000,
      max: 2100,
    },
    gpa: {
      type: Number,
      default: null,
      min: 0,
      max: 4,
    },
    classification: {
      type: String,
      default: null,
      maxlength: 50,
    },

    // --- Dữ liệu neo Blockchain ---
    issuedAt: {
      type: Date,
      required: true,
    },
    txHash: {
      type: String,
      required: true,
      lowercase: true,
      match: /^0x[a-f0-9]{64}$/, // Giao dịch hash Ethereum 32 bytes hex
    },
    blockNumber: {
      type: Number,
      required: true,
      min: 0,
    },
    logIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    // --- Trạng thái & Vòng đời ---
    status: {
      type: String,
      required: true,
      enum: ["active", "revoked", "locked"],
      default: "active",
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokeTxHash: {
      type: String,
      default: null,
      lowercase: true,
    },
    revokeBlockNumber: {
      type: Number,
      default: null,
    },

    // --- Trạng thái tạm khóa ---
    lockedAt: {
      type: Date,
      default: null,
    },
    lockTxHash: {
      type: String,
      default: null,
      lowercase: true,
    },
    lockBlockNumber: {
      type: Number,
      default: null,
    },

    metadataHash: {
      type: String,
      default: null,
      maxlength: 100,
    },
  },
  {
    timestamps: true, // Tự động quản lý createdAt và updatedAt
    versionKey: false, // Bỏ trường __v không cần thiết của Mongoose
  }
);

// -----------------------------------------------------------------------------
// CHIẾN LƯỢC ĐÁNH CHỈ MỤC (INDEXING STRATEGY)
// -----------------------------------------------------------------------------

// 1. Chỉ mục Unique: Đảm bảo tính duy nhất và toàn vẹn dữ liệu
certificateSchema.index({ certificateId: 1 }, { unique: true });
// Partial filter index cho certificateIdHash: Chỉ đánh index khi giá trị là chuỗi (tránh lỗi duplicate null)
certificateSchema.index(
  { certificateIdHash: 1 },
  {
    unique: true,
    partialFilterExpression: { certificateIdHash: { $type: "string" } },
  }
);
// Mỗi file PDF chỉ được cấp cho đúng một chứng chỉ
certificateSchema.index({ fileHash: 1 }, { unique: true });
// Mỗi giao dịch blockchain cấp chứng chỉ chỉ được đồng bộ một lần (Idempotency)
certificateSchema.index({ txHash: 1 }, { unique: true });

// 2. Chỉ mục phục vụ truy vấn lọc, phân trang và sắp xếp
// Lọc danh sách chứng chỉ theo ví issuer, sắp xếp theo thời gian mới nhất
certificateSchema.index({ issuerWallet: 1, issuedAt: -1 });
// Tra cứu nhanh theo mã số sinh viên
certificateSchema.index({ studentCode: 1 });
// Lọc theo trạng thái (active, locked, revoked) và phân trang
certificateSchema.index({ status: 1, issuedAt: -1 });
// Lọc theo loại văn bằng (bằng tốt nghiệp, chứng chỉ khóa học,...)
certificateSchema.index({ certificateType: 1, issuedAt: -1 });
// Lọc kết hợp theo năm tốt nghiệp, chuyên ngành và thời gian cấp
certificateSchema.index({ graduationYear: 1, majorNormalized: 1, issuedAt: -1 });
// Danh sách chứng chỉ mới nhất toàn trường trên trang chủ/search
certificateSchema.index({ issuedAt: -1 });

// 3. Chỉ mục tìm kiếm toàn văn (Text Search)
// Hỗ trợ người dùng tra cứu theo họ tên hoặc chuyên ngành không dấu, không phân biệt ngôn ngữ
certificateSchema.index(
  { studentNameNormalized: "text", majorNormalized: "text" },
  { name: "certificate_text_search", default_language: "none" }
);

/** Model Mongoose Certificate dùng để thao tác với collection certificates */
export const Certificate: Model<ICertificate> = model<ICertificate>(
  "Certificate",
  certificateSchema
);

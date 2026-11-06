/**
 * @file issuer.service.ts
 * @description Dịch vụ quản lý đơn vị cấp phát (Issuer) và chuẩn bị chứng từ phát hành (prepareCertificate).
 */

import bcrypt from "bcryptjs";
import type { FilterQuery } from "mongoose";
import { env } from "../config/env";
import {
  Certificate,
  ChainEvent,
  Issuer,
  User,
  type IIssuer,
  type IssuerDocument,
} from "../models";
import type { PrepareCertificateInput } from "../schemas/certificate";
import type { CreateIssuerInput } from "../schemas/issuer";
import type { IssuerDTO, PaginationMeta } from "../types/api";
import type { CertificateDetails } from "../types/certificate";
import { HttpError } from "../utils/http-error";
import { sha256Buffer } from "../utils/hash";
import { certificatePdfService } from "./certificate-pdf";
import { pinataService } from "./pinata.service";
import {
  CertificateService,
  confirmCertificate,
  listIssuerCertificates,
  lockCertificate,
  unlockCertificate,
} from "./certificate.service";
import {
  findIssuerUpdatedEvent,
  getIssuerOnChain,
} from "./chain.service";

/** Tham số truy vấn danh sách đơn vị phát hành */
export interface ListIssuersParams {
  q?: string;
  active?: boolean;
  page: number;
  limit: number;
}

/** Kết quả trả về danh sách Issuer kèm phân trang */
export interface IssuerListResult {
  data: IssuerDTO[];
  meta: PaginationMeta;
}

/** Chuyển Document sang đối tượng DTO an toàn */
function toIssuerDTO(issuer: IssuerDocument): IssuerDTO {
  return {
    id: issuer._id.toString(),
    name: issuer.name,
    code: issuer.code,
    walletAddress: issuer.walletAddress,
    logoUrl: issuer.logoUrl ?? null,
    website: issuer.website ?? null,
    isActive: issuer.isActive,
    onChainActive: issuer.onChainActive,
  };
}

/** Thoát ký tự đặc biệt cho Regex */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Lấy danh sách các đơn vị cấp phát (kèm tìm kiếm và lọc trạng thái)
 */
export async function listIssuers(
  params: ListIssuersParams
): Promise<IssuerListResult> {
  const filter: FilterQuery<IIssuer> = {};

  if (params.q) {
    const regex = new RegExp(escapeRegex(params.q), "i");
    filter.$or = [{ name: regex }, { code: regex }, { walletAddress: regex }];
  }

  if (params.active !== undefined) {
    filter.isActive = params.active;
  }

  const skip = (params.page - 1) * params.limit;

  const [issuers, total] = await Promise.all([
    Issuer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(params.limit),
    Issuer.countDocuments(filter),
  ]);

  return {
    data: issuers.map(toIssuerDTO),
    meta: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

/**
 * Tạo mới hoặc kích hoạt đơn vị cấp phát (Issuer)
 * - Kiểm tra trùng lặp ví, mã đơn vị và email
 * - Hỗ trợ gán tài khoản cũ (userId) hoặc tạo mới tài khoản (email + password)
 * - Xác minh giao dịch cấp quyền on-chain trên Smart Contract
 */
export async function createIssuer(
  input: CreateIssuerInput
): Promise<IssuerDTO> {
  const wallet = input.walletAddress.toLowerCase();

  // Kiểm tra trùng lặp mã đơn vị hoặc địa chỉ ví
  const existingIssuer = await Issuer.findOne({
    $or: [{ walletAddress: wallet }, { code: input.code }],
  });

  if (existingIssuer) {
    if (existingIssuer.code === input.code) {
      throw new HttpError(409, "ISSUER_EXISTS", "Mã đơn vị đã tồn tại");
    }
    throw new HttpError(409, "WALLET_IN_USE", "Ví đã được dùng cho issuer khác");
  }

  // Kiểm tra email nếu chọn kịch bản tạo mới tài khoản
  if (!input.userId && input.email) {
    const emailOwner = await User.findOne({ email: input.email });
    if (emailOwner) {
      throw new HttpError(409, "EMAIL_IN_USE", "Email đã được dùng cho tài khoản khác");
    }
  }

  let user = null;

  // Kịch bản 1: Liên kết với tài khoản người dùng đã có
  if (input.userId) {
    user = await User.findById(input.userId);

    if (!user) {
      throw new HttpError(404, "USER_NOT_FOUND", "Không tìm thấy tài khoản issuer");
    }

    if (user.role !== "issuer") {
      throw new HttpError(
        400,
        "INVALID_USER_ROLE",
        "Tài khoản được gán phải có role issuer"
      );
    }

    if (user.walletAddress && user.walletAddress !== wallet) {
      throw new HttpError(
        409,
        "WALLET_IN_USE",
        "Tài khoản đã gắn với ví khác"
      );
    }
  }

  // Đảm bảo ví chưa bị tài khoản khác sử dụng
  const walletOwner = await User.findOne({ walletAddress: wallet });
  if (
    walletOwner &&
    (!user || walletOwner._id.toString() !== user._id.toString())
  ) {
    throw new HttpError(409, "WALLET_IN_USE", "Ví đã được dùng cho tài khoản khác");
  }

  // Xác minh sự kiện thêm Issuer trên Smart Contract
  await findIssuerUpdatedEvent(input.txHash, wallet, input.name);
  const onChain = await getIssuerOnChain(wallet);

  if (!onChain.active) {
    throw new HttpError(
      422,
      "ISSUER_NOT_ACTIVE",
      "Issuer chưa được kích hoạt on-chain"
    );
  }

  if (onChain.name !== input.name) {
    throw new HttpError(
      422,
      "TX_INVALID",
      "Tên trên blockchain không khớp với dữ liệu gửi lên"
    );
  }

  let createdUserId: string | null = null;

  // Kịch bản 2: Tạo mới tài khoản người dùng kèm mã hóa mật khẩu Bcrypt
  if (!user && input.email && input.password) {
    try {
      const passwordHash = await bcrypt.hash(input.password, 10);
      user = await User.create({
        email: input.email,
        passwordHash,
        role: "issuer",
        displayName: input.name,
        walletAddress: wallet,
        isActive: true,
      });
      createdUserId = user._id.toString();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("duplicate key")) {
        throw new HttpError(409, "EMAIL_IN_USE", "Email đã được dùng cho tài khoản khác");
      }

      throw error;
    }
  }

  let issuer: IssuerDocument;

  // Tạo bản ghi Issuer trong DB
  try {
    issuer = await Issuer.create({
      name: input.name,
      code: input.code,
      walletAddress: wallet,
      userId: user?._id ?? null,
      logoUrl: input.logoUrl ?? null,
      website: input.website ?? null,
      isActive: true,
      onChainActive: true,
      chainAddedAt: new Date(),
    });
  } catch (error) {
    // Hoàn tác tạo User nếu tạo Issuer thất bại
    if (createdUserId) {
      await User.deleteOne({ _id: createdUserId }).catch(() => undefined);
    }

    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("duplicate key")) {
      throw new HttpError(409, "ISSUER_EXISTS", "Mã hoặc ví đã tồn tại");
    }

    throw error;
  }

  // Cập nhật địa chỉ ví vào tài khoản người dùng
  if (user) {
    try {
      user.walletAddress = wallet;
      await user.save();
    } catch (error) {
      await Issuer.deleteOne({ _id: issuer._id }).catch(() => undefined);
      if (createdUserId) {
        await User.deleteOne({ _id: createdUserId }).catch(() => undefined);
      }
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("duplicate key")) {
        throw new HttpError(409, "WALLET_IN_USE", "Ví đã được dùng cho tài khoản khác");
      }

      throw error;
    }
  }

  return toIssuerDTO(issuer);
}

/**
 * Vô hiệu hóa đơn vị cấp phát (Deactivate)
 * - Xác minh giao dịch hủy quyền on-chain
 * - Cập nhật isActive = false và ghi log ChainEvent
 */
export async function deactivateIssuer(
  issuerId: string,
  txHash: string
): Promise<IssuerDTO> {
  const issuer = await Issuer.findById(issuerId);

  if (!issuer) {
    throw new HttpError(404, "ISSUER_NOT_FOUND", "Không tìm thấy đơn vị cấp");
  }

  // Tính lũy thừa: nếu đã vô hiệu hóa thì trả về kết quả ngay
  if (!issuer.isActive && !issuer.onChainActive) {
    return toIssuerDTO(issuer);
  }

  // Xác minh sự kiện tắt kích hoạt trên Blockchain
  const event = await findIssuerUpdatedEvent(
    txHash,
    issuer.walletAddress,
    issuer.name,
    false
  );
  const onChain = await getIssuerOnChain(issuer.walletAddress);

  if (onChain.active) {
    throw new HttpError(422, "TX_INVALID", "Issuer vẫn đang active on-chain");
  }

  issuer.isActive = false;
  issuer.onChainActive = false;
  await issuer.save();

  // Ghi log sự kiện vào ChainEvent
  await ChainEvent.create({
    txHash,
    logIndex: event.logIndex,
    blockNumber: event.blockNumber,
    eventType: "IssuerUpdated",
    payload: {
      issuer: issuer.walletAddress,
      name: issuer.name,
      active: false,
    },
    contractAddress: env.CONTRACT_ADDRESS.toLowerCase(),
    processedAt: new Date(),
  }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("duplicate key")) {
      console.error("[chain-event] issuer deactivate insert failed:", message);
    }
  });

  return toIssuerDTO(issuer);
}

/** Lớp dịch vụ Issuer kế thừa CertificateService */
export class IssuerService extends CertificateService {
  confirmCertificate = confirmCertificate;
  listIssuerCertificates = listIssuerCertificates;
  prepareCertificate = prepareCertificate;
  lockCertificate = lockCertificate;
  unlockCertificate = unlockCertificate;
}

/** Thể hiện Singleton duy nhất của IssuerService */
export const issuerService = new IssuerService();

/** Kết quả trả về sau bước chuẩn bị chứng chỉ */
export interface PreparedCertificate {
  cid: string;
  fileHash: string;
  sizeBytes: number;
  templateId: string;
  templateVersion: string;
  filename: string;
}

/**
 * Bước 1: Chuẩn bị văn bằng (Prepare Certificate)
 * - Kiểm tra trùng lặp mã bằng
 * - Sinh file PDF có gắn kèm mã QR xác thực
 * - Tính toán mã băm SHA-256 của file PDF
 * - Tải tệp lên mạng lưu trữ phân tán IPFS (Pinata)
 * - Trả về CID và File Hash để Issuer ký và mint on-chain
 */
export async function prepareCertificate(
  input: PrepareCertificateInput,
  issuer: IssuerDocument
): Promise<PreparedCertificate> {
  const existing = await Certificate.findOne({
    certificateId: input.certificateId,
  });

  if (existing) {
    throw new HttpError(409, "CERTIFICATE_EXISTS", "Mã chứng chỉ đã tồn tại");
  }

  const baseUrl = env.FRONTEND_ORIGIN.split(",")[0]
    .trim()
    .replace(/\/$/, "");

  // 1. Tạo tệp PDF văn bằng
  const pdf = await certificatePdfService.generate({
    certificateType: input.certificateType,
    certificateId: input.certificateId,
    studentName: input.studentName,
    studentCode: input.studentCode,
    issuedAt: new Date(),
    issuerName: issuer.name,
    verifyUrl: `${baseUrl}/c/${input.certificateId}`,
    details: input.details as CertificateDetails,
  });

  // 2. Tính mã băm SHA-256 của tệp PDF
  const fileHash = sha256Buffer(pdf.buffer);

  // 3. Ghim tệp lên IPFS qua Pinata
  const pin = await pinataService.pinFileToIPFS(
    pdf.buffer,
    pdf.filename,
    "application/pdf"
  );

  // 4. Trả về metadata kỹ thuật để Issuer ký trên ví Web3
  return {
    cid: pin.cid,
    fileHash,
    sizeBytes: pdf.buffer.length,
    templateId: pdf.templateId,
    templateVersion: pdf.templateVersion,
    filename: pdf.filename,
  };
}

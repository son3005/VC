/**
 * @file chain.service.ts
 * @description Dịch vụ tương tác trực tiếp với Ethereum Smart Contract (CertificateRegistry).
 * Xử lý kiểm tra biên lai giao dịch (Receipt), đọc sự kiện (Events) và đối chiếu trạng thái On-chain.
 */

import { Contract, JsonRpcProvider, keccak256, toUtf8Bytes } from "ethers";
import abi from "../abi/CertificateRegistry.json";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";

/** Khởi tạo JSON-RPC Provider kết nối mạng Sepolia */
export const provider = new JsonRpcProvider(env.SEPOLIA_RPC_URL, env.CHAIN_ID, {
  staticNetwork: true,
});

/** Khởi tạo đối tượng Smart Contract CertificateRegistry */
export const registry = new Contract(env.CONTRACT_ADDRESS, abi, provider);

/** Dữ liệu sự kiện cập nhật đơn vị phát hành */
export interface IssuerUpdatedEvent {
  blockNumber: number;
  logIndex: number;
  name: string;
  active: boolean;
}

/**
 * Tìm và xác minh sự kiện IssuerUpdated từ transaction hash
 * Đảm bảo giao dịch thành công (status = 1) và khớp chính xác địa chỉ ví, tên và trạng thái
 */
export async function findIssuerUpdatedEvent(
  txHash: string,
  wallet: string,
  expectedName: string,
  expectedActive = true
): Promise<IssuerUpdatedEvent> {
  let receipt;

  try {
    receipt = await provider.getTransactionReceipt(txHash);
  } catch {
    throw new HttpError(502, "CHAIN_ERROR", "Không đọc được giao dịch từ blockchain");
  }

  // Giao dịch phải tồn tại và có status = 1 (thành công)
  if (!receipt || receipt.status !== 1) {
    throw new HttpError(
      422,
      "TX_INVALID",
      "Giao dịch không tồn tại hoặc đã thất bại"
    );
  }

  const event = registry.interface.getEvent("IssuerUpdated");
  if (!event) {
    throw new HttpError(500, "INTERNAL_ERROR", "ABI thiếu event IssuerUpdated");
  }

  // Duyệt qua danh sách logs để tìm sự kiện hợp lệ
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== env.CONTRACT_ADDRESS.toLowerCase()) {
      continue;
    }

    if (log.topics[0] !== event.topicHash) {
      continue;
    }

    const parsed = registry.interface.parseLog(log);
    if (!parsed) continue;

    const issuer = String(parsed.args.issuer).toLowerCase();
    const name = String(parsed.args.name);
    const active = Boolean(parsed.args.active);

    if (
      issuer === wallet.toLowerCase() &&
      active === expectedActive &&
      name === expectedName
    ) {
      return {
        blockNumber: receipt.blockNumber,
        logIndex: log.index,
        name,
        active,
      };
    }
  }

  throw new HttpError(
    422,
    "TX_INVALID",
    "Không tìm thấy sự kiện IssuerUpdated khớp với ví và tên"
  );
}

/** Đọc thông tin đơn vị phát hành trực tiếp từ Smart Contract qua địa chỉ ví */
export async function getIssuerOnChain(wallet: string): Promise<{
  name: string;
  active: boolean;
  addedAt: number;
}> {
  try {
    const result = await registry.getIssuer(wallet);

    return {
      name: String(result.name),
      active: Boolean(result.active),
      addedAt: Number(result.addedAt),
    };
  } catch {
    throw new HttpError(502, "CHAIN_ERROR", "Không đọc được issuer từ blockchain");
  }
}

/** Dữ liệu sự kiện phát hành văn bằng */
export interface CertificateIssuedEvent {
  blockNumber: number;
  logIndex: number;
  issuedAt: number;
}

/**
 * Tìm và xác minh sự kiện CertificateIssued từ transaction hash
 * Kiểm tra khớp chính xác mã chứng chỉ, file hash và ví đơn vị cấp
 */
export async function findCertificateIssuedEvent(
  txHash: string,
  expected: {
    certificateId: string;
    fileHash: string;
    issuerWallet: string;
  }
): Promise<CertificateIssuedEvent> {
  let receipt;

  try {
    receipt = await provider.getTransactionReceipt(txHash);
  } catch {
    throw new HttpError(502, "CHAIN_ERROR", "Không đọc được giao dịch từ blockchain");
  }

  if (!receipt || receipt.status !== 1) {
    throw new HttpError(
      422,
      "TX_INVALID",
      "Giao dịch không tồn tại hoặc đã thất bại"
    );
  }

  const event = registry.interface.getEvent("CertificateIssued");
  if (!event) {
    throw new HttpError(500, "INTERNAL_ERROR", "ABI thiếu event CertificateIssued");
  }

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== env.CONTRACT_ADDRESS.toLowerCase()) {
      continue;
    }

    if (log.topics[0] !== event.topicHash) {
      continue;
    }

    const parsed = registry.interface.parseLog(log);
    if (!parsed) continue;

    const certificateId = String(parsed.args.certificateId);
    const fileHash = String(parsed.args.fileHash);
    const issuer = String(parsed.args.issuer).toLowerCase();

    if (
      certificateId === expected.certificateId &&
      fileHash === expected.fileHash &&
      issuer === expected.issuerWallet.toLowerCase()
    ) {
      return {
        blockNumber: receipt.blockNumber,
        logIndex: log.index,
        issuedAt: Number(parsed.args.issuedAt),
      };
    }
  }

  throw new HttpError(
    422,
    "TX_INVALID",
    "Không tìm thấy sự kiện CertificateIssued khớp dữ liệu"
  );
}

/** Cấu trúc dữ liệu văn bằng lưu trữ on-chain trên Smart Contract */
export interface OnChainCertificate {
  certificateId: string;
  fileHash: string;
  ipfsCid: string;
  issuer: string;
  issuedAt: number;
  isRevoked: boolean;
  isLocked: boolean;
}

/**
 * Đọc thông tin văn bằng trực tiếp từ Smart Contract theo certificateId
 * Trả về null nếu chưa được phát hành trên chuỗi (bắt CALL_EXCEPTION)
 */
export async function getCertificateOnChain(
  certificateId: string
): Promise<OnChainCertificate | null> {
  try {
    const result = await registry.getCertificate(certificateId);

    return {
      certificateId: String(result.certificateId),
      fileHash: String(result.fileHash),
      ipfsCid: String(result.ipfsCid),
      issuer: String(result.issuer),
      issuedAt: Number(result.issuedAt),
      isRevoked: Boolean(result.isRevoked),
      isLocked: Boolean(result.isLocked),
    };
  } catch (error) {
    const code = (error as { code?: string }).code;

    // Bằng chưa phát hành trên hợp đồng sẽ ném CALL_EXCEPTION
    if (code === "CALL_EXCEPTION" || code === "BAD_DATA") {
      return null;
    }

    throw new HttpError(502, "CHAIN_ERROR", "Không đọc được chứng chỉ từ blockchain");
  }
}

/** Dữ liệu sự kiện thu hồi văn bằng */
export interface CertificateRevokedEvent {
  blockNumber: number;
  logIndex: number;
  revokedAt: number;
}

/**
 * Tìm và xác minh sự kiện CertificateRevoked từ transaction hash
 * So khớp mã băm định danh keccak256(certificateId)
 */
export async function findCertificateRevokedEvent(
  txHash: string,
  certificateId: string
): Promise<CertificateRevokedEvent> {
  let receipt;

  try {
    receipt = await provider.getTransactionReceipt(txHash);
  } catch {
    throw new HttpError(502, "CHAIN_ERROR", "Không đọc được giao dịch từ blockchain");
  }

  if (!receipt || receipt.status !== 1) {
    throw new HttpError(
      422,
      "TX_INVALID",
      "Giao dịch không tồn tại hoặc đã thất bại"
    );
  }

  const event = registry.interface.getEvent("CertificateRevoked");
  if (!event) {
    throw new HttpError(500, "INTERNAL_ERROR", "ABI thiếu event CertificateRevoked");
  }

  const expectedIdHash = keccak256(toUtf8Bytes(certificateId));

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== env.CONTRACT_ADDRESS.toLowerCase()) {
      continue;
    }

    if (log.topics[0] !== event.topicHash) {
      continue;
    }

    const parsed = registry.interface.parseLog(log);
    if (!parsed) continue;

    if (String(parsed.args.idHash).toLowerCase() === expectedIdHash.toLowerCase()) {
      return {
        blockNumber: receipt.blockNumber,
        logIndex: log.index,
        revokedAt: Number(parsed.args.revokedAt),
      };
    }
  }

  throw new HttpError(
    422,
    "TX_INVALID",
    "Không tìm thấy sự kiện CertificateRevoked khớp chứng chỉ"
  );
}

/** Dữ liệu sự kiện khóa hoặc mở khóa văn bằng */
export interface CertificateLockEvent {
  blockNumber: number;
  logIndex: number;
  timestamp: number;
}

/** Hàm trợ giúp dùng chung để tìm sự kiện CertificateLocked hoặc CertificateUnlocked */
async function findCertificateLockEvent(
  txHash: string,
  certificateId: string,
  eventName: "CertificateLocked" | "CertificateUnlocked",
  timestampArg: "lockedAt" | "unlockedAt"
): Promise<CertificateLockEvent> {
  let receipt;

  try {
    receipt = await provider.getTransactionReceipt(txHash);
  } catch {
    throw new HttpError(502, "CHAIN_ERROR", "Không đọc được giao dịch từ blockchain");
  }

  if (!receipt || receipt.status !== 1) {
    throw new HttpError(
      422,
      "TX_INVALID",
      "Giao dịch không tồn tại hoặc đã thất bại"
    );
  }

  const event = registry.interface.getEvent(eventName);
  if (!event) {
    throw new HttpError(500, "INTERNAL_ERROR", `ABI thiếu event ${eventName}`);
  }

  const expectedIdHash = keccak256(toUtf8Bytes(certificateId));

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== env.CONTRACT_ADDRESS.toLowerCase()) {
      continue;
    }
    if (log.topics[0] !== event.topicHash) continue;

    const parsed = registry.interface.parseLog(log);
    if (!parsed) continue;

    if (String(parsed.args.idHash).toLowerCase() === expectedIdHash.toLowerCase()) {
      return {
        blockNumber: receipt.blockNumber,
        logIndex: log.index,
        timestamp: Number(parsed.args[timestampArg]),
      };
    }
  }

  throw new HttpError(
    422,
    "TX_INVALID",
    `Không tìm thấy sự kiện ${eventName} khớp chứng chỉ`
  );
}

/** Tìm và xác minh sự kiện CertificateLocked */
export function findCertificateLockedEvent(txHash: string, certificateId: string) {
  return findCertificateLockEvent(
    txHash,
    certificateId,
    "CertificateLocked",
    "lockedAt"
  );
}

/** Tìm và xác minh sự kiện CertificateUnlocked */
export function findCertificateUnlockedEvent(txHash: string, certificateId: string) {
  return findCertificateLockEvent(
    txHash,
    certificateId,
    "CertificateUnlocked",
    "unlockedAt"
  );
}

/**
 * Thẩm định mã băm file SHA-256 trực tiếp trên Smart Contract
 * Trả về: exists (có trên chuỗi), valid (hợp lệ - chưa bị thu hồi/khóa), mã chứng chỉ và ngày cấp
 */
export async function verifyHashOnChain(fileHash: string): Promise<{
  exists: boolean;
  valid: boolean;
  certificateId: string;
  issuer: string;
  issuedAt: number;
}> {
  try {
    const result = await registry.verifyByHash(fileHash);

    return {
      exists: Boolean(result.exists),
      valid: Boolean(result.valid),
      certificateId: String(result.certificateId),
      issuer: String(result.issuer),
      issuedAt: Number(result.issuedAt),
    };
  } catch {
    throw new HttpError(502, "CHAIN_ERROR", "Không xác thực được hash trên blockchain");
  }
}

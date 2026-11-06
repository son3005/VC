/**
 * @file pinata.service.ts
 * @description Dịch vụ kết nối và ghim (pin) tệp tin lên mạng lưu trữ phân tán IPFS thông qua dịch vụ Pinata Cloud.
 */

import { env } from "../config/env";
import { HttpError } from "../utils/http-error";

/** Cấu trúc phản hồi từ API của Pinata Cloud */
interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/** Kết quả ghim tệp lên IPFS trả về cho ứng dụng */
export interface PinResult {
  /** Mã định danh nội dung (Content Identifier) trên IPFS (Qm... hoặc bafy...) */
  cid: string;
  /** Dung lượng tệp tính bằng bytes */
  sizeBytes: number;
}

/**
 * Tải và ghim tệp tin lên IPFS thông qua Pinata API
 * - Kiểm tra cấu hình PINATA_JWT
 * - Đóng gói dữ liệu tệp vào FormData kèm metadata ứng dụng
 * - Gửi yêu cầu HTTP POST với cơ chế timeout 30 giây (AbortSignal)
 * - Trả về mã CID và dung lượng tệp
 * 
 * @param {Buffer} buffer Dữ liệu nhị phân của tệp (ví dụ: PDF văn bằng)
 * @param {string} filename Tên tệp tin (ví dụ: "UIT-DEG-2026-0001.pdf")
 * @param {string} mimeType Định dạng MIME của tệp (ví dụ: "application/pdf")
 * @returns {Promise<PinResult>} Mã CID và dung lượng tệp
 */
export async function pinFileToIPFS(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<PinResult> {
  // 1. Kiểm tra khóa xác thực PINATA_JWT
  if (!env.PINATA_JWT) {
    throw new HttpError(500, "PINATA_ERROR", "PINATA_JWT chưa được cấu hình");
  }

  // 2. Chuẩn bị FormData chứa tệp nhị phân và siêu dữ liệu
  const form = new FormData();
  const bytes = new Uint8Array(buffer);
  form.append("file", new Blob([bytes], { type: mimeType }), filename);
  form.append(
    "pinataMetadata",
    JSON.stringify({ name: filename, keyvalues: { app: "verify-certification" } })
  );

  let response: Response;

  // 3. Gửi yêu cầu tải tệp lên Pinata Cloud kèm thời gian chờ tối đa 30s
  try {
    response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.PINATA_JWT}`,
      },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new HttpError(502, "PINATA_ERROR", "Không kết nối được tới Pinata");
  }

  // 4. Kiểm tra phản hồi HTTP
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[pinata] upload failed ${response.status}: ${detail}`);
    throw new HttpError(502, "PINATA_ERROR", "Upload IPFS thất bại");
  }

  const json = (await response.json()) as PinataResponse;

  // 5. Đảm bảo phản hồi có chứa mã băm IPFS (CID)
  if (!json.IpfsHash) {
    throw new HttpError(502, "PINATA_ERROR", "Pinata không trả về CID");
  }

  return {
    cid: json.IpfsHash,
    sizeBytes: json.PinSize ?? buffer.length,
  };
}

/** Lớp dịch vụ Pinata */
export class PinataService {
  pinFileToIPFS = pinFileToIPFS;
}

/** Thể hiện Singleton của PinataService dùng chung toàn ứng dụng */
export const pinataService = new PinataService();

import { env } from "../config/env";
import { HttpError } from "../utils/http-error";

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export interface PinResult {
  cid: string;
  sizeBytes: number;
}

export async function pinFileToIPFS(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<PinResult> {
  if (!env.PINATA_JWT) {
    throw new HttpError(500, "PINATA_ERROR", "PINATA_JWT chưa được cấu hình");
  }

  const form = new FormData();
  const bytes = new Uint8Array(buffer);
  form.append("file", new Blob([bytes], { type: mimeType }), filename);
  form.append(
    "pinataMetadata",
    JSON.stringify({ name: filename, keyvalues: { app: "verify-certification" } })
  );

  let response: Response;

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

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[pinata] upload failed ${response.status}: ${detail}`);
    throw new HttpError(502, "PINATA_ERROR", "Upload IPFS thất bại");
  }

  const json = (await response.json()) as PinataResponse;

  if (!json.IpfsHash) {
    throw new HttpError(502, "PINATA_ERROR", "Pinata không trả về CID");
  }

  return {
    cid: json.IpfsHash,
    sizeBytes: json.PinSize ?? buffer.length,
  };
}

export class PinataService {
  pinFileToIPFS = pinFileToIPFS;
}

export const pinataService = new PinataService();

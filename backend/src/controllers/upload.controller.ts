import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import { pinataService } from "../services/pinata.service";
import { detectMime } from "../utils/file";
import { sha256Buffer } from "../utils/hash";
import { HttpError } from "../utils/http-error";

export async function uploadController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw new HttpError(400, "UPLOAD_INVALID", "Thiếu file upload");
    }

    const detected = detectMime(req.file.buffer);
    if (!detected) {
      throw new HttpError(
        400,
        "UPLOAD_INVALID",
        "Chỉ chấp nhận PDF, PNG hoặc JPEG"
      );
    }

    const originalName = path
      .basename(req.file.originalname)
      .replace(/[^\w.\-]/g, "_");

    const fileHash = sha256Buffer(req.file.buffer);
    const pin = await pinataService.pinFileToIPFS(
      req.file.buffer,
      originalName,
      detected.mimeType
    );

    res.json({
      success: true,
      data: {
        cid: pin.cid,
        fileHash,
        sizeBytes: req.file.size,
        mimeType: detected.mimeType,
        filename: originalName,
      },
    });
  } catch (error) {
    next(error);
  }
}

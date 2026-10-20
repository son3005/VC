import type { NextFunction, Request, Response } from "express";
import {
  certificateListQuerySchema,
  confirmCertificateSchema,
} from "../schemas/certificate";
import {
  confirmCertificate,
  listIssuerCertificates,
} from "../services/certificate.service";
import { HttpError } from "../utils/http-error";

export async function createCertificateController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.issuer) {
      throw new HttpError(403, "FORBIDDEN", "Chỉ issuer được cấp chứng chỉ");
    }

    const input = confirmCertificateSchema.parse(req.body);
    const certificate = await confirmCertificate(input, req.issuer);

    res.status(201).json({ success: true, data: certificate });
  } catch (error) {
    next(error);
  }
}

export async function listCertificatesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.issuer) {
      throw new HttpError(403, "FORBIDDEN", "Chỉ issuer được xem danh sách");
    }

    const query = certificateListQuerySchema.parse(req.query);
    const result = await listIssuerCertificates(req.issuer, query);

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
}

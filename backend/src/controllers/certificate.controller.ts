import type { NextFunction, Request, Response } from "express";
import {
  certificateListQuerySchema,
  confirmCertificateSchema,
  revokeCertificateSchema,
} from "../schemas/certificate";
import { certificateIdParamSchema } from "../schemas/public";
import type { CertificateActor } from "../services/certificate.service";
import { issuerService } from "../services/issuer.service";
import { HttpError } from "../utils/http-error";

function getActor(req: Request): CertificateActor {
  if (!req.user) {
    throw new HttpError(401, "UNAUTHORIZED", "Chưa đăng nhập");
  }

  return {
    id: req.user.id,
    role: req.user.role,
    walletAddress: req.user.walletAddress,
  };
}

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
    const certificate = await issuerService.confirmCertificate(
      input,
      req.issuer
    );

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
    const result = await issuerService.listIssuerCertificates(
      req.issuer,
      query
    );

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCertificateController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = certificateIdParamSchema.parse(req.params);
    const certificate = await issuerService.getIssuerCertificate(
      id,
      getActor(req)
    );

    res.json({ success: true, data: certificate });
  } catch (error) {
    next(error);
  }
}

export async function revokeCertificateController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = certificateIdParamSchema.parse(req.params);
    const { txHash } = revokeCertificateSchema.parse(req.body);
    const certificate = await issuerService.revokeCertificate(
      id,
      txHash,
      getActor(req)
    );

    res.json({ success: true, data: certificate });
  } catch (error) {
    next(error);
  }
}

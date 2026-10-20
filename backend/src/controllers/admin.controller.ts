import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import {
  adminCertificateListQuerySchema,
  revokeCertificateSchema,
} from "../schemas/certificate";
import { certificateIdParamSchema } from "../schemas/public";
import { adminService } from "../services/admin.service";
import type { CertificateActor } from "../services/certificate.service";
import { HttpError } from "../utils/http-error";

function getAdminActor(req: Request): CertificateActor {
  if (!req.user) {
    throw new HttpError(401, "UNAUTHORIZED", "Chưa đăng nhập");
  }

  return {
    id: req.user.id,
    role: req.user.role,
    walletAddress: req.user.walletAddress,
  };
}

const syncBodySchema = z.object({
  fromBlock: z.coerce.number().int().nonnegative().optional(),
  toBlock: z.coerce.number().int().nonnegative().optional(),
});

export async function syncStatusController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const status = await adminService.syncStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
}

export async function triggerSyncController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = syncBodySchema.parse(req.body ?? {});
    const result = await adminService.syncEvents(
      input.fromBlock,
      input.toBlock
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function adminStatsController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await adminService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

export async function adminCertificatesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = adminCertificateListQuerySchema.parse(req.query);
    const result = await adminService.listAllCertificates(query);

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
}

export async function adminCertificateDetailController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = certificateIdParamSchema.parse(req.params);
    const certificate = await adminService.getIssuerCertificate(
      id,
      getAdminActor(req)
    );

    res.json({ success: true, data: certificate });
  } catch (error) {
    next(error);
  }
}

export async function adminRevokeCertificateController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = certificateIdParamSchema.parse(req.params);
    const { txHash } = revokeCertificateSchema.parse(req.body);
    const certificate = await adminService.revokeCertificate(
      id,
      txHash,
      getAdminActor(req)
    );

    res.json({ success: true, data: certificate });
  } catch (error) {
    next(error);
  }
}

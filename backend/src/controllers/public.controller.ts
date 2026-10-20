import type { NextFunction, Request, Response } from "express";
import {
  certificateIdParamSchema,
  publicSearchQuerySchema,
  recentQuerySchema,
  verifyQuerySchema,
} from "../schemas/public";
import { certificateService } from "../services/certificate.service";

export async function searchPublicController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = publicSearchQuerySchema.parse(req.query);
    const result = await certificateService.searchPublicCertificates(query);

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
}

export async function recentPublicController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = recentQuerySchema.parse(req.query);
    const data = await certificateService.listRecentCertificates(query.limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function detailPublicController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = certificateIdParamSchema.parse(req.params);
    const certificate = await certificateService.getPublicCertificate(id);
    res.json({ success: true, data: certificate });
  } catch (error) {
    next(error);
  }
}

export async function verifyPublicController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { hash } = verifyQuerySchema.parse(req.query);
    const result = await certificateService.verifyCertificateHash(hash);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function filtersPublicController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await certificateService.getPublicFilters();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

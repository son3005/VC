import type { NextFunction, Request, Response } from "express";
import {
  createIssuerSchema,
  issuerListQuerySchema,
} from "../schemas/issuer";
import { createIssuer, listIssuers } from "../services/issuer.service";

export async function listIssuersController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = issuerListQuerySchema.parse(req.query);
    const result = await listIssuers(query);

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
}

export async function createIssuerController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = createIssuerSchema.parse(req.body);
    const issuer = await createIssuer(input);

    res.status(201).json({
      success: true,
      data: issuer,
    });
  } catch (error) {
    next(error);
  }
}

import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { backfillEvents, getSyncStatus } from "../services/sync.service";

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
    const status = await getSyncStatus();
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
    const result = await backfillEvents(input.fromBlock, input.toBlock);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

import { z } from "zod";
import {
  objectIdSchema,
  paginationSchema,
  txHashSchema,
  walletAddressSchema,
} from "./common";

export const createIssuerSchema = z.object({
  name: z.string().min(2, "Tên đơn vị quá ngắn").max(100),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Mã đơn vị chỉ gồm A-Z, 0-9, _ và -")
    .transform((value) => value.toUpperCase()),
  walletAddress: walletAddressSchema,
  userId: objectIdSchema.optional(),
  logoUrl: z.string().url().max(300).optional(),
  website: z.string().url().max(300).optional(),
  txHash: txHashSchema,
});

export const issuerListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});

export type CreateIssuerInput = z.infer<typeof createIssuerSchema>;

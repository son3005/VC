import { z } from "zod";
import {
  certificateIdSchema,
  certificateStatusSchema,
  certificateTypeSchema,
  fileHashSchema,
  paginationSchema,
} from "./common";

export const publicSearchQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  major: z.string().trim().max(100).optional(),
  studentCode: z
    .string()
    .regex(/^[0-9]{6,12}$/, "MSSV không hợp lệ")
    .optional(),
  status: certificateStatusSchema.optional(),
  type: certificateTypeSchema.optional(),
});

export const recentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).default(6),
});

export const verifyQuerySchema = z.object({
  hash: fileHashSchema,
});

export const certificateIdParamSchema = z.object({
  id: certificateIdSchema,
});

export const filtersQuerySchema = z.object({
  type: certificateTypeSchema.optional(),
});

export type PublicSearchQuery = z.infer<typeof publicSearchQuerySchema>;

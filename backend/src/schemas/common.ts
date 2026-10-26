import { z } from "zod";

export const walletAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Địa chỉ ví không hợp lệ")
  .transform((value) => value.toLowerCase());

export const txHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Transaction hash không hợp lệ")
  .transform((value) => value.toLowerCase());

export const fileHashSchema = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/, "File hash phải có dạng sha256:<64 hex>");

export const cidSchema = z
  .string()
  .min(10, "CID quá ngắn")
  .max(100, "CID quá dài");

export const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "ObjectId không hợp lệ");

export const certificateIdSchema = z
  .string()
  .min(6, "Mã chứng chỉ quá ngắn")
  .max(64, "Mã chứng chỉ quá dài")
  .regex(/^[A-Z0-9-]+$/, "Mã chứng chỉ chỉ gồm A-Z, 0-9 và dấu gạch ngang");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export const artifactTypeSchema = z.enum(["pdf", "image", "web"]);
export const certificateStatusSchema = z.enum(["active", "revoked", "locked"]);
export const certificateTypeSchema = z.enum([
  "degree",
  "course",
  "credit",
  "other",
]);

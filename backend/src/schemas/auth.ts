import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email không hợp lệ")
    .max(150)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(128),
  walletAddress: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Địa chỉ ví không hợp lệ")
    .transform((value) => value.toLowerCase()),
});

export type LoginInput = z.infer<typeof loginSchema>;

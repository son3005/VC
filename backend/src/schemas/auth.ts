import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .email("Email không hợp lệ")
    .max(150)
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;

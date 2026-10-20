import type { NextFunction, Request, Response } from "express";
import { loginSchema } from "../schemas/auth";
import {
  getUserById,
  login,
  toUserDTO,
} from "../services/auth.service";
import { HttpError } from "../utils/http-error";

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await login(email, password);

    res.json({
      success: true,
      data: {
        token: result.token,
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function meController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new HttpError(401, "UNAUTHORIZED", "Chưa đăng nhập");
    }

    const user = await getUserById(req.user.id);
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
}

export { toUserDTO };

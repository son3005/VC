import type { RequestHandler } from "express";
import type { UserRole } from "../models";
import { verifyToken } from "../services/auth.service";
import { HttpError } from "../utils/http-error";

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(new HttpError(401, "UNAUTHORIZED", "Thiếu token xác thực"));
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return next(new HttpError(401, "UNAUTHORIZED", "Thiếu token xác thực"));
  }

  try {
    const payload = verifyToken(token);

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      walletAddress: payload.wallet ?? null,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, "UNAUTHORIZED", "Chưa đăng nhập"));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new HttpError(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này")
      );
    }

    return next();
  };
}

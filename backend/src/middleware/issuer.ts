import type { RequestHandler } from "express";
import { Issuer } from "../models";
import { HttpError } from "../utils/http-error";

/**
 * Chỉ cho phép user role=issuer, có ví, và issuer đang active trong DB.
 * Dùng cho các route cấp / thu hồi chứng chỉ.
 */
export const requireActiveIssuer: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.user) {
      throw new HttpError(401, "UNAUTHORIZED", "Chưa đăng nhập");
    }

    if (req.user.role !== "issuer") {
      throw new HttpError(403, "FORBIDDEN", "Chỉ issuer được thực hiện thao tác này");
    }

    if (!req.user.walletAddress) {
      throw new HttpError(403, "FORBIDDEN", "Tài khoản issuer chưa gắn ví");
    }

    const issuer = await Issuer.findOne({
      walletAddress: req.user.walletAddress,
      isActive: true,
      onChainActive: true,
    });

    if (!issuer) {
      throw new HttpError(403, "FORBIDDEN", "Đơn vị cấp không còn hiệu lực");
    }

    req.issuer = issuer;
    return next();
  } catch (error) {
    return next(error);
  }
};

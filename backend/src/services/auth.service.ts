import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { User, type UserDocument, type UserRole } from "../models";
import type { UserDTO } from "../types/api";
import { HttpError } from "../utils/http-error";

export interface AuthTokenPayload extends jwt.JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  wallet: string | null;
}

export interface LoginResult {
  token: string;
  user: UserDTO;
}

export function toUserDTO(user: UserDocument): UserDTO {
  return {
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    walletAddress: user.walletAddress ?? null,
  };
}

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user || !user.isActive) {
    throw new HttpError(
      401,
      "UNAUTHORIZED",
      "Email hoặc mật khẩu không đúng"
    );
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new HttpError(
      401,
      "UNAUTHORIZED",
      "Email hoặc mật khẩu không đúng"
    );
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      wallet: user.walletAddress ?? null,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] }
  );

  return { token, user: toUserDTO(user) };
}

export async function getUserById(id: string): Promise<UserDTO> {
  const user = await User.findById(id);

  if (!user || !user.isActive) {
    throw new HttpError(401, "UNAUTHORIZED", "Tài khoản không tồn tại");
  }

  return toUserDTO(user);
}

export function verifyToken(token: string): AuthTokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
  } catch {
    throw new HttpError(401, "UNAUTHORIZED", "Token không hợp lệ hoặc đã hết hạn");
  }
}

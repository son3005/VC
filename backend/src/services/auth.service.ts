/**
 * @file auth.service.ts
 * @description Dịch vụ xác thực và phân quyền người dùng (Authentication & Authorization Service).
 * 
 * Các nguyên lý bảo mật và vai trò kiến trúc cốt lõi:
 * 1. Cơ chế Định danh kép kết hợp Web2 & Web3 (Hybrid Dual-Identity Authentication):
 *    - Xác thực 3 yếu tố (3-Factor Verification): Email + Mật khẩu (Bcrypt) + Địa chỉ ví Ethereum (EVM Wallet).
 *    - Đảm bảo người dùng sở hữu đồng thời thông tin đăng nhập truyền thống và quyền quản trị ví Blockchain.
 * 2. Phòng chống tấn công dò quét tài khoản (Anti-User Enumeration):
 *    - Sử dụng thông báo lỗi đồng nhất `INVALID_LOGIN_MESSAGE` cho mọi tình huống thất bại
 *      (email không tồn tại, tài khoản bị vô hiệu hóa, mật khẩu sai, hoặc địa chỉ ví không khớp)
 *      nhằm ngăn kẻ tấn công phát hiện email nào đã đăng ký trong hệ thống.
 * 3. Quản lý phiên làm việc không trạng thái (Stateless Session via JWT):
 *    - Ký và xác thực mã JWT Token với các thuộc tính định danh an toàn (`sub`, `email`, `role`, `wallet`).
 * 4. Chuyển đổi dữ liệu an toàn (Data Transfer Object - DTO):
 *    - Hàm `toUserDTO` bóc tách dữ liệu sạch, ngăn chặn tuyệt đối việc để lộ `passwordHash` ra ngoài API.
 */

import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { User, type UserDocument, type UserRole } from "../models";
import type { UserDTO } from "../types/api";
import { HttpError } from "../utils/http-error";

/**
 * Cấu trúc Payload chứa bên trong JWT Token sau khi giải mã
 */
export interface AuthTokenPayload extends jwt.JwtPayload {
  /** Định danh duy nhất của người dùng (User MongoDB _id dạng chuỗi) */
  sub: string;
  /** Địa chỉ thư điện tử của tài khoản */
  email: string;
  /** Quyền hạn trong hệ thống: "admin" | "issuer" | "student" */
  role: UserRole;
  /** Địa chỉ ví Ethereum liên kết với tài khoản (hoặc null nếu chưa gắn ví) */
  wallet: string | null;
}

/**
 * Kết quả trả về sau khi đăng nhập thành công
 */
export interface LoginResult {
  /** Chuỗi JWT Bearer Token dùng cho các request tiếp theo */
  token: string;
  /** Thông tin định danh an toàn của người dùng */
  user: UserDTO;
}

/**
 * Chuyển đổi User Document nội bộ của MongoDB thành User DTO an toàn
 * Loại bỏ các trường nhạy cảm như `passwordHash` trước khi phản hồi về Client.
 * 
 * @param {UserDocument} user Bản ghi người dùng từ MongoDB
 * @returns {UserDTO} Đối tượng DTO an toàn
 */
export function toUserDTO(user: UserDocument): UserDTO {
  return {
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    walletAddress: user.walletAddress ?? null,
  };
}

/**
 * Thông điệp lỗi bảo mật chung:
 * Không chỉ rõ lỗi nằm ở Email, Mật khẩu hay Ví để ngăn chặn kỹ thuật dò quét tài khoản (User Enumeration).
 */
const INVALID_LOGIN_MESSAGE =
  "Tài khoản, mật khẩu hoặc ví không đúng";

/**
 * Thực hiện quy trình đăng nhập 3 bước (Email + Mật khẩu + Ví Ethereum)
 * 
 * Quy trình xử lý:
 * 1. Tìm người dùng theo Email (kèm trường ẩn passwordHash) và kiểm tra cờ isActive.
 * 2. So khớp mật khẩu sử dụng thuật toán băm an toàn Bcrypt (bcrypt.compare).
 * 3. So khớp địa chỉ ví Web3 (so sánh chữ thường không phân biệt checksum EIP-55).
 * 4. Cập nhật mốc thời gian đăng nhập mới nhất (lastLoginAt).
 * 5. Ký phát hành JWT Token với khóa bí mật JWT_SECRET và thời gian hết hạn JWT_EXPIRES_IN.
 * 
 * @param {string} email Địa chỉ thư điện tử
 * @param {string} password Mật khẩu người dùng nhập
 * @param {string} walletAddress Địa chỉ ví cá nhân Web3
 * @returns {Promise<LoginResult>} Token JWT và thông tin người dùng an toàn
 * @throws {HttpError} 401 UNAUTHORIZED nếu bất kỳ yếu tố nào không khớp
 */
export async function login(
  email: string,
  password: string,
  walletAddress: string
): Promise<LoginResult> {
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user || !user.isActive) {
    throw new HttpError(401, "UNAUTHORIZED", INVALID_LOGIN_MESSAGE);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new HttpError(401, "UNAUTHORIZED", INVALID_LOGIN_MESSAGE);
  }

  const walletMatches =
    !!user.walletAddress &&
    user.walletAddress.toLowerCase() === walletAddress.toLowerCase();

  if (!walletMatches) {
    throw new HttpError(401, "UNAUTHORIZED", INVALID_LOGIN_MESSAGE);
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

/**
 * Lấy thông tin tài khoản người dùng theo ID
 * 
 * @param {string} id Mã định danh người dùng (MongoDB _id)
 * @returns {Promise<UserDTO>} Thông tin an toàn của người dùng
 * @throws {HttpError} 401 UNAUTHORIZED nếu tài khoản không tồn tại hoặc đã bị vô hiệu hóa
 */
export async function getUserById(id: string): Promise<UserDTO> {
  const user = await User.findById(id);

  if (!user || !user.isActive) {
    throw new HttpError(401, "UNAUTHORIZED", "Tài khoản không tồn tại");
  }

  return toUserDTO(user);
}

/**
 * Thẩm định tính hợp lệ và giải mã chữ ký của JWT Token
 * 
 * @param {string} token Chuỗi Bearer JWT Token từ Authorization Header
 * @returns {AuthTokenPayload} Dữ liệu người dùng đã được giải mã và kiểm tra chữ ký
 * @throws {HttpError} 401 UNAUTHORIZED nếu Token bị sửa đổi, sai chữ ký hoặc đã hết hạn
 */
export function verifyToken(token: string): AuthTokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
  } catch {
    throw new HttpError(401, "UNAUTHORIZED", "Token không hợp lệ hoặc đã hết hạn");
  }
}

/**
 * Lớp dịch vụ Xác thực (AuthService) gom nhóm toàn bộ các hàm xử lý định danh
 */
export class AuthService {
  login = login;
  getUserById = getUserById;
  verifyToken = verifyToken;
}

/** Thể hiện Singleton duy nhất của AuthService cho toàn bộ ứng dụng */
export const authService = new AuthService();

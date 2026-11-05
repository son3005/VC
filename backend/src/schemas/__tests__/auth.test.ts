/**
 * @file auth.test.ts
 * @description Kiểm thử đơn vị (Unit Tests) cho bộ xác thực schema đăng nhập (loginSchema).
 * 
 * Kiểm tra các tiêu chuẩn:
 * 1. Chuẩn hóa dữ liệu đầu vào (Data Normalization):
 *    - Tự động trim khoảng trắng và chuyển email về dạng chữ thường (lowercase).
 *    - Chuyển địa chỉ ví Ethereum (walletAddress) về dạng chữ thường chuẩn hóa (checksum-agnostic).
 * 2. Tính bắt buộc của địa chỉ ví:
 *    - Bắt buộc phải có địa chỉ ví kèm theo email và mật khẩu (hệ thống xác thực kết hợp Web2 & Web3).
 * 3. Kiểm tra định dạng địa chỉ ví:
 *    - Từ chối các chuỗi không tuân thủ định dạng EVM address (0x theo sau bởi 40 ký tự hex).
 */

import { loginSchema } from "../auth";

describe("loginSchema", () => {
  /**
   * Test case 1: Chuẩn hóa email và địa chỉ ví
   * Đảm bảo các khoảng trắng thừa được loại bỏ và các ký tự hoa được chuyển thành chữ thường,
   * giúp việc so khớp trong cơ sở dữ liệu và xác thực chữ ký luôn đồng nhất.
   */
  it("normalizes email and wallet addresses", () => {
    const result = loginSchema.parse({
      email: "  Admin@VerifyCert.Local ",
      password: "Admin@123456",
      walletAddress: "0x9B8DF93F172AAEB67C31BE257C9E4A55A8DF1B3B",
    });

    expect(result.email).toBe("admin@verifycert.local");
    expect(result.walletAddress).toBe("0x9b8df93f172aaeb67c31be257c9e4a55a8df1b3b");
  });

  /**
   * Test case 2: Trường walletAddress là bắt buộc
   * Đảm bảo yêu cầu định danh kép (Dual-identity: Email + Wallet). Nếu thiếu ví,
   * safeParse phải trả về success: false.
   */
  it("requires a wallet address", () => {
    const result = loginSchema.safeParse({
      email: "admin@verifycert.local",
      password: "Admin@123456",
    });

    expect(result.success).toBe(false);
  });

  /**
   * Test case 3: Từ chối địa chỉ ví sai định dạng
   * Đảm bảo chuỗi walletAddress không đúng chuẩn Regex EVM (^0x[a-fA-F0-9]{40}$)
   * sẽ bị chặn ngay tại tầng schema validation trước khi vào controller/database.
   */
  it("rejects a malformed wallet address", () => {
    const result = loginSchema.safeParse({
      email: "admin@verifycert.local",
      password: "Admin@123456",
      walletAddress: "not-a-wallet",
    });

    expect(result.success).toBe(false);
  });
});

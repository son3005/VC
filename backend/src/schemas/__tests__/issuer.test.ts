/**
 * @file issuer.test.ts
 * @description Kiểm thử đơn vị (Unit Tests) cho bộ quy tắc xác thực tạo mới đơn vị cấp phát chứng chỉ (createIssuerSchema).
 * 
 * Các tiêu chuẩn và quy tắc nghiệp vụ quan trọng được kiểm thử:
 * 1. Phương thức đăng ký kép (Dual Onboarding Mode) với điều kiện loại trừ lẫn nhau (Mutual Exclusivity - XOR):
 *    - Trường hợp 1: Tạo tài khoản người dùng mới đại diện cho Issuer -> Cần cung cấp đầy đủ `email` và `password`.
 *    - Trường hợp 2: Liên kết với tài khoản người dùng đã có sẵn -> Chỉ cần cung cấp `userId` (MongoDB ObjectId).
 *    - Không được phép thiếu cả hai phương thức hoặc cung cấp đồng thời cả hai.
 * 2. Xác thực độ phức tạp mật khẩu:
 *    - Mật khẩu phải có độ dài tối thiểu 8 ký tự để đảm bảo an toàn.
 * 3. Chuẩn hóa định dạng:
 *    - Kiểm tra địa chỉ ví Ethereum (`walletAddress`) và mã băm giao dịch kích hoạt On-chain (`txHash`).
 */

import { createIssuerSchema } from "../issuer";

/**
 * Dữ liệu cơ sở đại diện cho một đơn vị cấp phát chứng chỉ (Issuer)
 * Bao gồm tên đơn vị, mã định danh viết tắt, địa chỉ ví quản trị và transaction hash kích hoạt trên Smart Contract.
 */
const base = {
  name: "Khoa Công nghệ Thông tin",
  code: "CNTT",
  walletAddress: "0xf009863379F6B0056C1D828fDE2827fD94202a1B",
  txHash: "0x" + "a".repeat(64),
};

describe("createIssuerSchema", () => {
  /**
   * Test case 1: Chấp nhận tạo mới tài khoản Issuer đi kèm email và mật khẩu
   * Dành cho kịch bản quản trị viên vừa cấp quyền đơn vị vừa tạo tài khoản đăng nhập lần đầu.
   */
  it("accepts a new issuer account with email and password", () => {
    const result = createIssuerSchema.safeParse({
      ...base,
      email: "issuer@fit.uit.edu.vn",
      password: "StrongPass123",
    });

    expect(result.success).toBe(true);
  });

  /**
   * Test case 2: Chấp nhận gán quyền Issuer cho tài khoản đã tồn tại qua `userId`
   * Dành cho kịch bản nâng cấp quyền của một tài khoản người dùng đã đăng ký trước đó.
   */
  it("accepts an existing user by userId", () => {
    const result = createIssuerSchema.safeParse({
      ...base,
      userId: "65a1b2c3d4e5f6a7b8c9d0e1",
    });

    expect(result.success).toBe(true);
  });

  /**
   * Test case 3: Từ chối nếu thiếu cả `userId` lẫn bộ đôi `email`/`password`
   * Quy tắc superRefine đảm bảo bắt buộc phải có một trong hai cách thức định danh tài khoản.
   */
  it("rejects when neither userId nor email/password is provided", () => {
    const result = createIssuerSchema.safeParse(base);
    expect(result.success).toBe(false);
  });

  /**
   * Test case 4: Từ chối nếu cung cấp đồng thời cả `userId` và bộ đôi `email`/`password`
   * Quy tắc loại trừ đảm bảo tính nhất quán (không thể vừa liên kết tài khoản cũ vừa tạo tài khoản mới).
   */
  it("rejects when both userId and email/password are provided", () => {
    const result = createIssuerSchema.safeParse({
      ...base,
      userId: "65a1b2c3d4e5f6a7b8c9d0e1",
      email: "issuer@fit.uit.edu.vn",
      password: "StrongPass123",
    });

    expect(result.success).toBe(false);
  });

  /**
   * Test case 5: Từ chối mật khẩu không đạt chuẩn an toàn
   * Mật khẩu '123' có độ dài dưới 8 ký tự phải bị chặn bởi schema rule `.min(8)`.
   */
  it("rejects a weak password", () => {
    const result = createIssuerSchema.safeParse({
      ...base,
      email: "issuer@fit.uit.edu.vn",
      password: "123",
    });

    expect(result.success).toBe(false);
  });
});

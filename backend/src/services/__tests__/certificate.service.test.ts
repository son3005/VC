/**
 * @file certificate.service.test.ts
 * @description Kiểm thử đơn vị (Unit Tests) cho quy trình thu hồi văn bằng (revokeCertificate).
 * 
 * Kiểm tra các tiêu chuẩn an toàn và logic phân quyền:
 * 1. Kiểm tra tồn tại bản ghi (404 CERTIFICATE_NOT_FOUND).
 * 2. Phân quyền thu hồi (Authorization & Ownership):
 *    - Đơn vị sở hữu ví phát hành (Issuer Wallet) được phép thu hồi.
 *    - Quản trị viên hệ thống (Admin) có toàn quyền thu hồi bất kỳ chứng chỉ nào.
 *    - Người lạ hoặc Issuer khác không được phép thu hồi (403 FORBIDDEN).
 * 3. Tính lũy thừa và nhất quán giao dịch (Idempotency & Conflict):
 *    - Gọi lại hàm thu hồi với cùng transaction hash -> Trả về kết quả thành công mà không ghi trùng dữ liệu (Idempotent).
 *    - Gửi yêu cầu thu hồi với transaction hash khác khi đã bị thu hồi -> Báo lỗi xung đột (409 ALREADY_REVOKED).
 * 4. Đối chiếu tính toàn vẹn trạng thái On-chain (Blockchain State Verification):
 *    - Từ chối cập nhật nếu sự kiện trên Smart Contract vẫn báo chứng chỉ còn hoạt động (422 TX_INVALID).
 *    - Lan truyền đúng mã lỗi khi transaction hash không hợp lệ trên mạng lưới.
 */

jest.mock("../../models", () => ({
  Certificate: { findOne: jest.fn() },
  ChainEvent: { create: jest.fn() },
}));

jest.mock("../chain.service", () => ({
  findCertificateIssuedEvent: jest.fn(),
  findCertificateRevokedEvent: jest.fn(),
  getCertificateOnChain: jest.fn(),
  verifyHashOnChain: jest.fn(),
}));

import { Certificate, ChainEvent } from "../../models";
import {
  findCertificateRevokedEvent,
  getCertificateOnChain,
} from "../chain.service";
import { revokeCertificate } from "../certificate.service";
import { HttpError } from "../../utils/http-error";

const findOne = Certificate.findOne as jest.Mock;
const chainEventCreate = ChainEvent.create as jest.Mock;
const findRevoked = findCertificateRevokedEvent as jest.Mock;
const getOnChain = getCertificateOnChain as jest.Mock;

const CERT_ID = "UIT-DEG-2026-0001";
const ISSUER_WALLET = "0xf009863379f6b0056c1d828fde2827fd94202a1b";
const TX_HASH = "0x" + "a".repeat(64);

/**
 * Hàm khởi tạo bản ghi văn bằng mẫu với các trường mặc định
 */
function makeDoc(overrides: Record<string, unknown> = {}) {
  return {
    certificateId: CERT_ID,
    certificateType: "degree",
    studentName: "Nguyễn Văn An",
    studentCode: "2311095",
    major: "Kỹ thuật phần mềm",
    graduationYear: 2026,
    gpa: 3.45,
    classification: "Giỏi",
    issuedAt: new Date("2026-10-19T08:00:00.000Z"),
    status: "active",
    details: {},
    templateId: "degree-v1",
    templateVersion: "1.0.0",
    issuerName: "Khoa Công nghệ Thông tin",
    artifactType: "pdf",
    mimeType: "application/pdf",
    filename: "cert.pdf",
    sizeBytes: 497,
    ipfsCid: "QmUtYcoXUvXcWyAY7wBWHupxfPH4AKADKFeQK5DnbAKN8A",
    txHash: "0x" + "b".repeat(64),
    blockNumber: 1,
    issuerWallet: ISSUER_WALLET,
    revokedAt: null,
    revokeTxHash: null,
    revokeBlockNumber: null,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/** Chủ thể người dùng: Đơn vị đã phát hành chứng chỉ */
const issuer = {
  id: "user-1",
  role: "issuer" as const,
  walletAddress: ISSUER_WALLET,
};

/** Chủ thể người dùng: Đơn vị khác không sở hữu chứng chỉ */
const stranger = {
  id: "user-2",
  role: "issuer" as const,
  walletAddress: "0x1111111111111111111111111111111111111111",
};

/** Chủ thể người dùng: Quản trị viên hệ thống */
const admin = {
  id: "user-3",
  role: "admin" as const,
  walletAddress: null,
};

describe("revokeCertificate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chainEventCreate.mockResolvedValue({});
  });

  /**
   * Test case 1: Trả về lỗi 404 khi không tìm thấy mã chứng chỉ trong cơ sở dữ liệu
   */
  it("returns 404 when certificate does not exist", async () => {
    findOne.mockResolvedValue(null);

    await expect(revokeCertificate(CERT_ID, TX_HASH, issuer)).rejects.toMatchObject({
      status: 404,
      code: "CERTIFICATE_NOT_FOUND",
    });
  });

  /**
   * Test case 2: Cho phép chính đơn vị đã phát hành (khớp issuerWallet) thu hồi văn bằng
   * Cập nhật trạng thái thành 'revoked', lưu transaction hash và block number.
   */
  it("allows the issuing wallet to revoke", async () => {
    const doc = makeDoc();
    findOne.mockResolvedValue(doc);
    findRevoked.mockResolvedValue({
      blockNumber: 100,
      logIndex: 2,
      revokedAt: 1792467192,
    });
    getOnChain.mockResolvedValue({ isRevoked: true });

    const result = await revokeCertificate(CERT_ID, TX_HASH, issuer);

    expect(doc.status).toBe("revoked");
    expect(doc.revokeTxHash).toBe(TX_HASH);
    expect(doc.revokeBlockNumber).toBe(100);
    expect(doc.save).toHaveBeenCalled();
    expect(result.status).toBe("revoked");
  });

  /**
   * Test case 3: Từ chối yêu cầu từ ví không phải là đơn vị đã phát hành văn bằng
   * Báo lỗi 403 FORBIDDEN và không thực hiện lưu thay đổi.
   */
  it("rejects a wallet that did not issue the certificate", async () => {
    const doc = makeDoc();
    findOne.mockResolvedValue(doc);

    await expect(
      revokeCertificate(CERT_ID, TX_HASH, stranger)
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });

    expect(doc.save).not.toHaveBeenCalled();
  });

  /**
   * Test case 4: Cho phép Quản trị viên (Admin) thu hồi bất kỳ văn bằng nào
   */
  it("allows admin to revoke any certificate", async () => {
    const doc = makeDoc();
    findOne.mockResolvedValue(doc);
    findRevoked.mockResolvedValue({
      blockNumber: 101,
      logIndex: 0,
      revokedAt: 1792467200,
    });
    getOnChain.mockResolvedValue({ isRevoked: true });

    const result = await revokeCertificate(CERT_ID, TX_HASH, admin);

    expect(result.status).toBe("revoked");
    expect(doc.save).toHaveBeenCalled();
  });

  /**
   * Test case 5: Đảm bảo tính lũy thừa (Idempotency) khi gửi lại cùng một giao dịch thu hồi
   * Trả về kết quả thành công mà không gọi lại thao tác lưu dữ liệu (doc.save).
   */
  it("is idempotent for the same revoke transaction", async () => {
    const doc = makeDoc({
      status: "revoked",
      revokeTxHash: TX_HASH,
      revokedAt: new Date("2026-10-20T00:00:00.000Z"),
    });
    findOne.mockResolvedValue(doc);

    const result = await revokeCertificate(CERT_ID, TX_HASH, issuer);

    expect(result.status).toBe("revoked");
    expect(doc.save).not.toHaveBeenCalled();
    expect(findRevoked).not.toHaveBeenCalled();
  });

  /**
   * Test case 6: Từ chối yêu cầu thu hồi lần thứ hai với transaction hash khác
   * Báo lỗi 409 ALREADY_REVOKED để ngăn chặn ghi đè lịch sử giao dịch ban đầu.
   */
  it("rejects a second revoke with a different transaction", async () => {
    const doc = makeDoc({
      status: "revoked",
      revokeTxHash: "0x" + "c".repeat(64),
    });
    findOne.mockResolvedValue(doc);

    await expect(
      revokeCertificate(CERT_ID, TX_HASH, issuer)
    ).rejects.toMatchObject({ status: 409, code: "ALREADY_REVOKED" });
  });

  /**
   * Test case 7: Từ chối cập nhật nếu dữ liệu On-chain vẫn phản hồi chứng chỉ còn hoạt động
   * Ngăn chặn tình huống lệch pha dữ liệu khi giao dịch blockchain thất bại (Reverted).
   */
  it("rejects when the chain still reports the certificate as active", async () => {
    const doc = makeDoc();
    findOne.mockResolvedValue(doc);
    findRevoked.mockResolvedValue({
      blockNumber: 100,
      logIndex: 2,
      revokedAt: 1792467192,
    });
    getOnChain.mockResolvedValue({ isRevoked: false });

    await expect(
      revokeCertificate(CERT_ID, TX_HASH, issuer)
    ).rejects.toMatchObject({ status: 422, code: "TX_INVALID" });

    expect(doc.save).not.toHaveBeenCalled();
  });

  /**
   * Test case 8: Lan truyền chính xác lỗi khi transaction hash không hợp lệ trên chuỗi
   */
  it("propagates an invalid transaction error", async () => {
    const doc = makeDoc();
    findOne.mockResolvedValue(doc);
    findRevoked.mockRejectedValue(
      new HttpError(422, "TX_INVALID", "Không tìm thấy event")
    );

    await expect(
      revokeCertificate(CERT_ID, TX_HASH, issuer)
    ).rejects.toMatchObject({ status: 422, code: "TX_INVALID" });
  });
});

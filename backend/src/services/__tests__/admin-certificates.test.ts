/**
 * @file admin-certificates.test.ts
 * @description Kiểm thử đơn vị (Unit Tests) cho chức năng quản trị tra cứu văn bằng (listAllCertificates).
 * 
 * Bộ kiểm thử bao gồm:
 * 1. Phân trang và bộ lọc nâng cao cho Quản trị viên (Admin Filters & Pagination):
 *    - Lọc theo từ khóa tìm kiếm (`q`), trạng thái (`status`), loại bằng (`type`), địa chỉ ví đơn vị cấp (`issuerWallet`), năm tốt nghiệp (`year`).
 *    - Xác thực tính chính xác của đối tượng điều kiện truy vấn MongoDB (`find`) và siêu dữ liệu phân trang (`meta`).
 * 2. Xử lý trường hợp không truyền bộ lọc tùy chọn (Default query handling).
 */

jest.mock("../../models", () => ({
  Certificate: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
  ChainEvent: { create: jest.fn() },
}));

jest.mock("../chain.service", () => ({
  findCertificateIssuedEvent: jest.fn(),
  findCertificateRevokedEvent: jest.fn(),
  getCertificateOnChain: jest.fn(),
  verifyHashOnChain: jest.fn(),
}));

import type { AdminCertificateListQuery } from "../../schemas/certificate";
import { Certificate } from "../../models";
import { listAllCertificates } from "../certificate.service";

const find = Certificate.find as jest.Mock;
const count = Certificate.countDocuments as jest.Mock;

/** Dữ liệu văn bằng mẫu đại diện cho bản ghi MongoDB */
const doc = {
  certificateId: "UIT-DEG-2026-0001",
  certificateType: "degree",
  studentName: "Nguyễn Văn An",
  studentCode: "2311095",
  major: "Kỹ thuật phần mềm",
  graduationYear: 2026,
  gpa: 3.45,
  classification: "Giỏi",
  artifactType: "pdf",
  filename: "cert.pdf",
  status: "active",
  issuedAt: new Date("2026-10-19T08:00:00.000Z"),
  txHash: "0x" + "a".repeat(64),
  revokedAt: null,
  revokeTxHash: null,
};

describe("listAllCertificates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    count.mockResolvedValue(1);
  });

  /**
   * Test case 1: Áp dụng đầy đủ các bộ lọc của quản trị viên và tính toán phân trang
   * Đảm bảo câu lệnh MongoDB `find` nhận đủ các tham số điều kiện kết hợp `$or` tìm kiếm full-text
   * và tính toán đúng siêu dữ liệu phân trang (page, limit, total, totalPages).
   */
  it("applies admin filters and pagination", async () => {
    find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([doc]),
        }),
      }),
    });

    const query: AdminCertificateListQuery = {
      page: 2,
      limit: 10,
      q: "nguyen",
      status: "active",
      type: "degree",
      issuerWallet: "0xf009863379f6b0056c1d828fde2827fd94202a1b",
      year: 2026,
    };

    const result = await listAllCertificates(query);

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "active",
        certificateType: "degree",
        issuerWallet: "0xf009863379f6b0056c1d828fde2827fd94202a1b",
        graduationYear: 2026,
        $or: expect.any(Array),
      })
    );
    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  /**
   * Test case 2: Bỏ qua các bộ lọc tùy chọn khi người dùng không cung cấp
   * Đảm bảo khi chỉ truyền page và limit, query object truyền vào `find()` là rỗng `{}`.
   */
  it("omits optional filters when not provided", async () => {
    find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    await listAllCertificates({ page: 1, limit: 20 });

    expect(find).toHaveBeenCalledWith({});
  });
});

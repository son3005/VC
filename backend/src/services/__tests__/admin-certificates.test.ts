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

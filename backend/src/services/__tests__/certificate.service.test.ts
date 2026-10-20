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

const issuer = {
  id: "user-1",
  role: "issuer" as const,
  walletAddress: ISSUER_WALLET,
};

const stranger = {
  id: "user-2",
  role: "issuer" as const,
  walletAddress: "0x1111111111111111111111111111111111111111",
};

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

  it("returns 404 when certificate does not exist", async () => {
    findOne.mockResolvedValue(null);

    await expect(revokeCertificate(CERT_ID, TX_HASH, issuer)).rejects.toMatchObject({
      status: 404,
      code: "CERTIFICATE_NOT_FOUND",
    });
  });

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

  it("rejects a wallet that did not issue the certificate", async () => {
    const doc = makeDoc();
    findOne.mockResolvedValue(doc);

    await expect(
      revokeCertificate(CERT_ID, TX_HASH, stranger)
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });

    expect(doc.save).not.toHaveBeenCalled();
  });

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

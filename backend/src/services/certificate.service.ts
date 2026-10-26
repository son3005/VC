import { keccak256, toUtf8Bytes } from "ethers";
import type { FilterQuery } from "mongoose";
import { env } from "../config/env";
import {
  Certificate,
  ChainEvent,
  type CertificateDocument,
  type ICertificate,
  type IssuerDocument,
} from "../models";
import type {
  AdminCertificateListQuery,
  CertificateListQuery,
  ConfirmCertificateInput,
} from "../schemas/certificate";
import type { PublicSearchQuery } from "../schemas/public";
import type {
  CertificateDetailDTO,
  CertificateIssuerDTO,
  CertificateSummaryDTO,
  PaginationMeta,
  RecentCertificateDTO,
} from "../types/api";
import type {
  CertificateDetails,
  CourseDetails,
  CreditDetails,
  DegreeDetails,
} from "../types/certificate";
import { HttpError } from "../utils/http-error";
import { maskCode, maskName } from "../utils/mask";
import { normalizeText } from "../utils/normalize";
import {
  findCertificateIssuedEvent,
  findCertificateLockedEvent,
  findCertificateRevokedEvent,
  findCertificateUnlockedEvent,
  getCertificateOnChain,
  verifyHashOnChain,
} from "./chain.service";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function verifyUrl(certificateId: string): string {
  return `/c/${certificateId}`;
}

function toSummary(doc: CertificateDocument): CertificateSummaryDTO {
  return {
    certificateId: doc.certificateId,
    certificateType: doc.certificateType,
    studentName: doc.studentName,
    studentCode: doc.studentCode,
    major: doc.major ?? null,
    graduationYear: doc.graduationYear ?? null,
    gpa: doc.gpa ?? null,
    classification: doc.classification ?? null,
    issuedAt: doc.issuedAt.toISOString(),
    status: doc.status,
    verifyUrl: verifyUrl(doc.certificateId),
  };
}

function toDetail(
  doc: CertificateDocument,
  status: "active" | "revoked" | "locked"
): CertificateDetailDTO {
  return {
    ...toSummary(doc),
    status,
    details: doc.details as CertificateDetails,
    templateId: doc.templateId,
    templateVersion: doc.templateVersion,
    issuerName: doc.issuerName,
    artifactType: doc.artifactType,
    mimeType: doc.mimeType,
    filename: doc.filename,
    sizeBytes: doc.sizeBytes,
    ipfsCid: doc.ipfsCid,
    txHash: doc.txHash,
    blockNumber: doc.blockNumber,
    statusSource: "chain",
  };
}

function toRecent(doc: CertificateDocument): RecentCertificateDTO {
  return {
    certificateId: doc.certificateId,
    studentNameMasked: maskName(doc.studentName),
    studentCodeMasked: maskCode(doc.studentCode),
    major: doc.major ?? null,
    graduationYear: doc.graduationYear ?? null,
    issuedAt: doc.issuedAt.toISOString(),
    status: doc.status,
    txHash: doc.txHash,
    blockNumber: doc.blockNumber,
  };
}

function toIssuerCertificate(doc: CertificateDocument): CertificateIssuerDTO {
  return {
    certificateId: doc.certificateId,
    certificateType: doc.certificateType,
    studentName: doc.studentName,
    studentCode: doc.studentCode,
    major: doc.major ?? null,
    graduationYear: doc.graduationYear ?? null,
    gpa: doc.gpa ?? null,
    classification: doc.classification ?? null,
    artifactType: doc.artifactType,
    filename: doc.filename,
    status: doc.status,
    issuedAt: doc.issuedAt.toISOString(),
    txHash: doc.txHash,
    revokedAt: doc.revokedAt?.toISOString() ?? null,
    revokeTxHash: doc.revokeTxHash ?? null,
    lockedAt: doc.lockedAt?.toISOString() ?? null,
    lockTxHash: doc.lockTxHash ?? null,
  };
}

function extractSearchFields(
  input: ConfirmCertificateInput,
  issuedAt: Date
): {
  major: string | null;
  graduationYear: number | null;
  gpa: number | null;
  classification: string | null;
} {
  switch (input.certificateType) {
    case "degree": {
      const details = input.details as DegreeDetails;
      return {
        major: details.major,
        graduationYear: details.graduationYear,
        gpa: details.gpa,
        classification: details.classification,
      };
    }
    case "course": {
      const details = input.details as CourseDetails;
      return {
        major: null,
        graduationYear: issuedAt.getUTCFullYear(),
        gpa: details.grade4 ?? null,
        classification: null,
      };
    }
    case "credit": {
      const details = input.details as CreditDetails;
      return {
        major: details.programName,
        graduationYear: issuedAt.getUTCFullYear(),
        gpa: details.gpa ?? null,
        classification: null,
      };
    }
    case "other":
      return {
        major: null,
        graduationYear: issuedAt.getUTCFullYear(),
        gpa: null,
        classification: null,
      };
  }
}

export async function confirmCertificate(
  input: ConfirmCertificateInput,
  issuer: IssuerDocument
): Promise<CertificateIssuerDTO> {
  const existingById = await Certificate.findOne({
    certificateId: input.certificateId,
  });

  if (existingById) {
    if (existingById.txHash.toLowerCase() === input.txHash.toLowerCase()) {
      return toIssuerCertificate(existingById);
    }
    throw new HttpError(409, "CERTIFICATE_EXISTS", "Mã chứng chỉ đã tồn tại");
  }

  const existingByHash = await Certificate.findOne({ fileHash: input.fileHash });
  if (existingByHash) {
    throw new HttpError(409, "HASH_EXISTS", "File này đã được cấp chứng chỉ");
  }

  const event = await findCertificateIssuedEvent(input.txHash, {
    certificateId: input.certificateId,
    fileHash: input.fileHash,
    issuerWallet: issuer.walletAddress,
  });

  const issuedAt = new Date(event.issuedAt * 1000);
  const searchFields = extractSearchFields(input, issuedAt);

  let certificate: CertificateDocument;

  try {
    certificate = await Certificate.create({
      certificateId: input.certificateId,
      certificateIdHash: keccak256(toUtf8Bytes(input.certificateId)),
      certificateType: input.certificateType,
      details: input.details,
      templateId: input.templateId,
      templateVersion: input.templateVersion,
      fileHash: input.fileHash,
      ipfsCid: input.ipfsCid,
      artifactType: input.artifactType,
      mimeType: input.mimeType,
      filename: input.filename,
      sizeBytes: input.sizeBytes,
      issuerId: issuer._id,
      issuerWallet: issuer.walletAddress.toLowerCase(),
      issuerName: issuer.name,
      studentName: input.studentName,
      studentNameNormalized: normalizeText(input.studentName),
      studentCode: input.studentCode,
      major: searchFields.major,
      majorNormalized: searchFields.major
        ? normalizeText(searchFields.major)
        : null,
      graduationYear: searchFields.graduationYear,
      gpa: searchFields.gpa,
      classification: searchFields.classification,
      issuedAt,
      txHash: input.txHash,
      blockNumber: event.blockNumber,
      logIndex: event.logIndex,
      status: "active",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("duplicate key")) {
      throw new HttpError(
        409,
        "CERTIFICATE_EXISTS",
        "Mã chứng chỉ hoặc file hash đã tồn tại"
      );
    }

    throw error;
  }

  try {
    await ChainEvent.create({
      txHash: input.txHash,
      logIndex: event.logIndex,
      blockNumber: event.blockNumber,
      eventType: "CertificateIssued",
      payload: {
        certificateId: input.certificateId,
        fileHash: input.fileHash,
        ipfsCid: input.ipfsCid,
        issuer: issuer.walletAddress.toLowerCase(),
        issuedAt: event.issuedAt,
      },
      contractAddress: env.CONTRACT_ADDRESS.toLowerCase(),
      processedAt: new Date(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("duplicate key")) {
      console.error("[chain-event] insert failed:", message);
    }
  }

  return toIssuerCertificate(certificate);
}

export interface CertificateActor {
  id: string;
  role: "admin" | "issuer";
  walletAddress: string | null;
}

export async function getIssuerCertificate(
  certificateId: string,
  actor: CertificateActor
): Promise<CertificateIssuerDTO> {
  const doc = await Certificate.findOne({ certificateId });

  if (!doc) {
    throw new HttpError(404, "CERTIFICATE_NOT_FOUND", "Không tìm thấy chứng chỉ");
  }

  if (
    actor.role !== "admin" &&
    (!actor.walletAddress ||
      actor.walletAddress.toLowerCase() !== doc.issuerWallet.toLowerCase())
  ) {
    throw new HttpError(403, "FORBIDDEN", "Bạn không có quyền xem chứng chỉ này");
  }

  return toIssuerCertificate(doc);
}

export async function revokeCertificate(
  certificateId: string,
  txHash: string,
  actor: CertificateActor
): Promise<CertificateIssuerDTO> {
  const doc = await Certificate.findOne({ certificateId });

  if (!doc) {
    throw new HttpError(404, "CERTIFICATE_NOT_FOUND", "Không tìm thấy chứng chỉ");
  }

  if (doc.status === "revoked") {
    if (
      doc.revokeTxHash &&
      doc.revokeTxHash.toLowerCase() === txHash.toLowerCase()
    ) {
      return toIssuerCertificate(doc);
    }
    throw new HttpError(409, "ALREADY_REVOKED", "Chứng chỉ đã bị thu hồi");
  }

  if (actor.role !== "admin") {
    if (
      !actor.walletAddress ||
      actor.walletAddress.toLowerCase() !== doc.issuerWallet.toLowerCase()
    ) {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Chỉ issuer đã cấp hoặc admin được thu hồi"
      );
    }
  }

  const event = await findCertificateRevokedEvent(txHash, certificateId);
  const onChain = await getCertificateOnChain(certificateId);

  if (!onChain || !onChain.isRevoked) {
    throw new HttpError(
      422,
      "TX_INVALID",
      "Chứng chỉ chưa được thu hồi on-chain"
    );
  }

  doc.status = "revoked";
  doc.revokedAt = new Date(event.revokedAt * 1000);
  doc.revokeTxHash = txHash.toLowerCase();
  doc.revokeBlockNumber = event.blockNumber;
  await doc.save();

  try {
    await ChainEvent.create({
      txHash,
      logIndex: event.logIndex,
      blockNumber: event.blockNumber,
      eventType: "CertificateRevoked",
      payload: {
        certificateId,
        revokedAt: event.revokedAt,
      },
      contractAddress: env.CONTRACT_ADDRESS.toLowerCase(),
      processedAt: new Date(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("duplicate key")) {
      console.error("[chain-event] revoke insert failed:", message);
    }
  }

  return toIssuerCertificate(doc);
}

export async function lockCertificate(
  certificateId: string,
  txHash: string,
  actor: CertificateActor
): Promise<CertificateIssuerDTO> {
  const doc = await Certificate.findOne({ certificateId });

  if (!doc) {
    throw new HttpError(404, "CERTIFICATE_NOT_FOUND", "Không tìm thấy chứng chỉ");
  }
  if (doc.status === "revoked") {
    throw new HttpError(409, "ALREADY_REVOKED", "Chứng chỉ đã bị thu hồi");
  }
  if (!actor.walletAddress || actor.walletAddress.toLowerCase() !== doc.issuerWallet.toLowerCase()) {
    throw new HttpError(403, "FORBIDDEN", "Chỉ issuer đã cấp được khoá chứng chỉ");
  }
  if (doc.status === "locked") {
    if (doc.lockTxHash && doc.lockTxHash.toLowerCase() === txHash.toLowerCase()) {
      return toIssuerCertificate(doc);
    }
    throw new HttpError(409, "ALREADY_LOCKED", "Chứng chỉ đã bị tạm khoá");
  }

  const event = await findCertificateLockedEvent(txHash, certificateId);
  const onChain = await getCertificateOnChain(certificateId);

  if (!onChain || !onChain.isLocked) {
    throw new HttpError(422, "TX_INVALID", "Chứng chỉ chưa được khoá on-chain");
  }

  doc.status = "locked";
  doc.lockedAt = new Date(event.timestamp * 1000);
  doc.lockTxHash = txHash.toLowerCase();
  doc.lockBlockNumber = event.blockNumber;
  await doc.save();

  await ChainEvent.create({
    txHash,
    logIndex: event.logIndex,
    blockNumber: event.blockNumber,
    eventType: "CertificateLocked",
    payload: { certificateId, lockedAt: event.timestamp },
    contractAddress: env.CONTRACT_ADDRESS.toLowerCase(),
    processedAt: new Date(),
  }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("duplicate key")) {
      console.error("[chain-event] lock insert failed:", message);
    }
  });

  return toIssuerCertificate(doc);
}

export async function unlockCertificate(
  certificateId: string,
  txHash: string,
  actor: CertificateActor
): Promise<CertificateIssuerDTO> {
  const doc = await Certificate.findOne({ certificateId });

  if (!doc) {
    throw new HttpError(404, "CERTIFICATE_NOT_FOUND", "Không tìm thấy chứng chỉ");
  }
  if (doc.status === "revoked") {
    throw new HttpError(409, "ALREADY_REVOKED", "Chứng chỉ đã bị thu hồi");
  }
  if (actor.role !== "admin") {
    if (!actor.walletAddress || actor.walletAddress.toLowerCase() !== doc.issuerWallet.toLowerCase()) {
      throw new HttpError(403, "FORBIDDEN", "Chỉ issuer hoặc admin được mở khoá");
    }
  }
  if (doc.status !== "locked") {
    throw new HttpError(409, "NOT_LOCKED", "Chứng chỉ không ở trạng thái tạm khoá");
  }

  const event = await findCertificateUnlockedEvent(txHash, certificateId);
  const onChain = await getCertificateOnChain(certificateId);

  if (!onChain || onChain.isLocked || onChain.isRevoked) {
    throw new HttpError(422, "TX_INVALID", "Chứng chỉ chưa được mở khoá on-chain");
  }

  doc.status = "active";
  doc.lockedAt = null;
  doc.lockTxHash = null;
  doc.lockBlockNumber = null;
  await doc.save();

  await ChainEvent.create({
    txHash,
    logIndex: event.logIndex,
    blockNumber: event.blockNumber,
    eventType: "CertificateUnlocked",
    payload: { certificateId, unlockedAt: event.timestamp },
    contractAddress: env.CONTRACT_ADDRESS.toLowerCase(),
    processedAt: new Date(),
  }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("duplicate key")) {
      console.error("[chain-event] unlock insert failed:", message);
    }
  });

  return toIssuerCertificate(doc);
}

export async function listIssuerCertificates(
  issuer: IssuerDocument,
  query: CertificateListQuery
): Promise<{ data: CertificateIssuerDTO[]; meta: PaginationMeta }> {
  const filter: FilterQuery<ICertificate> = { issuerId: issuer._id };

  if (query.status) filter.status = query.status;
  if (query.type) filter.certificateType = query.type;

  if (query.q) {
    const regex = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [
      { certificateId: regex },
      { studentNameNormalized: regex },
      { studentCode: regex },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [docs, total] = await Promise.all([
    Certificate.find(filter)
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(query.limit),
    Certificate.countDocuments(filter),
  ]);

  return {
    data: docs.map(toIssuerCertificate),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function listAllCertificates(
  query: AdminCertificateListQuery
): Promise<{ data: CertificateIssuerDTO[]; meta: PaginationMeta }> {
  const filter: FilterQuery<ICertificate> = {};

  if (query.status) filter.status = query.status;
  if (query.type) filter.certificateType = query.type;
  if (query.issuerWallet) filter.issuerWallet = query.issuerWallet;
  if (query.year) filter.graduationYear = query.year;

  if (query.q) {
    const regex = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [
      { certificateId: regex },
      { studentNameNormalized: regex },
      { studentCode: regex },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [docs, total] = await Promise.all([
    Certificate.find(filter)
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(query.limit),
    Certificate.countDocuments(filter),
  ]);

  return {
    data: docs.map(toIssuerCertificate),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function searchPublicCertificates(
  query: PublicSearchQuery
): Promise<{ data: CertificateSummaryDTO[]; meta: PaginationMeta }> {
  const filter: FilterQuery<ICertificate> = {};

  if (query.status) filter.status = query.status;
  if (query.type) filter.certificateType = query.type;
  if (query.year) filter.graduationYear = query.year;
  if (query.studentCode) filter.studentCode = query.studentCode;

  if (query.major) {
    filter.majorNormalized = normalizeText(query.major);
  }

  if (query.q) {
    const q = query.q.trim();

    if (/^[0-9]{6,12}$/.test(q)) {
      filter.studentCode = q;
    } else if (/^UIT-[A-Z]+-[0-9]{4}-[0-9]{4}$/i.test(q)) {
      filter.certificateId = q.toUpperCase();
    } else {
      const regex = new RegExp(escapeRegex(normalizeText(q)), "i");
      filter.$or = [
        { studentNameNormalized: regex },
        { majorNormalized: regex },
      ];
    }
  }

  const skip = (query.page - 1) * query.limit;

  const [docs, total] = await Promise.all([
    Certificate.find(filter)
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(query.limit),
    Certificate.countDocuments(filter),
  ]);

  return {
    data: docs.map(toSummary),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getPublicCertificate(
  certificateId: string
): Promise<CertificateDetailDTO> {
  const doc = await Certificate.findOne({ certificateId });

  if (!doc) {
    throw new HttpError(404, "CERTIFICATE_NOT_FOUND", "Không tìm thấy chứng chỉ");
  }

  const onChain = await getCertificateOnChain(certificateId);
  if (!onChain) {
    throw new HttpError(404, "CERTIFICATE_NOT_FOUND", "Chứng chỉ không tồn tại on-chain");
  }

  return toDetail(
    doc,
    onChain.isRevoked ? "revoked" : onChain.isLocked ? "locked" : "active"
  );
}

export async function listRecentCertificates(
  limit: number
): Promise<RecentCertificateDTO[]> {
  const docs = await Certificate.find({})
    .sort({ issuedAt: -1 })
    .limit(limit);

  return docs.map(toRecent);
}

export async function verifyCertificateHash(
  fileHash: string
): Promise<{
  exists: boolean;
  valid: boolean;
  certificateId: string | null;
  issuer: string | null;
  issuedAt: string | null;
  certificate: CertificateDetailDTO | null;
}> {
  const onChain = await verifyHashOnChain(fileHash);

  if (!onChain.exists) {
    return {
      exists: false,
      valid: false,
      certificateId: null,
      issuer: null,
      issuedAt: null,
      certificate: null,
    };
  }

  const doc = await Certificate.findOne({
    certificateId: onChain.certificateId,
  });

  return {
    exists: true,
    valid: onChain.valid,
    certificateId: onChain.certificateId,
    issuer: onChain.issuer,
    issuedAt: new Date(onChain.issuedAt * 1000).toISOString(),
    certificate: doc
      ? toDetail(doc, doc.status)
      : null,
  };
}

export async function getPublicFilters(): Promise<{
  years: number[];
  majors: string[];
  types: string[];
}> {
  const [years, majors, types] = await Promise.all([
    Certificate.distinct("graduationYear", { graduationYear: { $ne: null } }),
    Certificate.distinct("major", { major: { $ne: null } }),
    Certificate.distinct("certificateType"),
  ]);

  return {
    years: (years as number[]).sort((a, b) => b - a),
    majors: (majors as string[]).sort((a, b) => a.localeCompare(b, "vi")),
    types: types as string[],
  };
}

export class CertificateService {
  listAllCertificates = listAllCertificates;
  getIssuerCertificate = getIssuerCertificate;
  revokeCertificate = revokeCertificate;
  searchPublicCertificates = searchPublicCertificates;
  getPublicCertificate = getPublicCertificate;
  listRecentCertificates = listRecentCertificates;
  verifyCertificateHash = verifyCertificateHash;
  getPublicFilters = getPublicFilters;
}

export const certificateService = new CertificateService();

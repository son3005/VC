import type { FilterQuery } from "mongoose";
import { env } from "../config/env";
import {
  Certificate,
  Issuer,
  User,
  type IIssuer,
  type IssuerDocument,
} from "../models";
import type { PrepareCertificateInput } from "../schemas/certificate";
import type { CreateIssuerInput } from "../schemas/issuer";
import type { IssuerDTO, PaginationMeta } from "../types/api";
import type { CertificateDetails } from "../types/certificate";
import { HttpError } from "../utils/http-error";
import { sha256Buffer } from "../utils/hash";
import { certificatePdfService } from "./certificate-pdf";
import { pinataService } from "./pinata.service";
import {
  CertificateService,
  confirmCertificate,
  listIssuerCertificates,
} from "./certificate.service";
import {
  findIssuerUpdatedEvent,
  getIssuerOnChain,
} from "./chain.service";

export interface ListIssuersParams {
  q?: string;
  active?: boolean;
  page: number;
  limit: number;
}

export interface IssuerListResult {
  data: IssuerDTO[];
  meta: PaginationMeta;
}

function toIssuerDTO(issuer: IssuerDocument): IssuerDTO {
  return {
    id: issuer._id.toString(),
    name: issuer.name,
    code: issuer.code,
    walletAddress: issuer.walletAddress,
    logoUrl: issuer.logoUrl ?? null,
    website: issuer.website ?? null,
    isActive: issuer.isActive,
    onChainActive: issuer.onChainActive,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listIssuers(
  params: ListIssuersParams
): Promise<IssuerListResult> {
  const filter: FilterQuery<IIssuer> = {};

  if (params.q) {
    const regex = new RegExp(escapeRegex(params.q), "i");
    filter.$or = [{ name: regex }, { code: regex }, { walletAddress: regex }];
  }

  if (params.active !== undefined) {
    filter.isActive = params.active;
  }

  const skip = (params.page - 1) * params.limit;

  const [issuers, total] = await Promise.all([
    Issuer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(params.limit),
    Issuer.countDocuments(filter),
  ]);

  return {
    data: issuers.map(toIssuerDTO),
    meta: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

export async function createIssuer(
  input: CreateIssuerInput
): Promise<IssuerDTO> {
  const wallet = input.walletAddress.toLowerCase();

  const existingIssuer = await Issuer.findOne({
    $or: [{ walletAddress: wallet }, { code: input.code }],
  });

  if (existingIssuer) {
    if (existingIssuer.code === input.code) {
      throw new HttpError(409, "ISSUER_EXISTS", "Mã đơn vị đã tồn tại");
    }
    throw new HttpError(409, "WALLET_IN_USE", "Ví đã được dùng cho issuer khác");
  }

  let user = null;

  if (input.userId) {
    user = await User.findById(input.userId);

    if (!user) {
      throw new HttpError(404, "USER_NOT_FOUND", "Không tìm thấy tài khoản issuer");
    }

    if (user.role !== "issuer") {
      throw new HttpError(
        400,
        "INVALID_USER_ROLE",
        "Tài khoản được gán phải có role issuer"
      );
    }

    if (user.walletAddress && user.walletAddress !== wallet) {
      throw new HttpError(
        409,
        "WALLET_IN_USE",
        "Tài khoản đã gắn với ví khác"
      );
    }
  }

  const walletOwner = await User.findOne({ walletAddress: wallet });
  if (
    walletOwner &&
    (!user || walletOwner._id.toString() !== user._id.toString())
  ) {
    throw new HttpError(409, "WALLET_IN_USE", "Ví đã được dùng cho tài khoản khác");
  }

  await findIssuerUpdatedEvent(input.txHash, wallet, input.name);
  const onChain = await getIssuerOnChain(wallet);

  if (!onChain.active) {
    throw new HttpError(
      422,
      "ISSUER_NOT_ACTIVE",
      "Issuer chưa được kích hoạt on-chain"
    );
  }

  if (onChain.name !== input.name) {
    throw new HttpError(
      422,
      "TX_INVALID",
      "Tên trên blockchain không khớp với dữ liệu gửi lên"
    );
  }

  let issuer: IssuerDocument;

  try {
    issuer = await Issuer.create({
      name: input.name,
      code: input.code,
      walletAddress: wallet,
      userId: user?._id ?? null,
      logoUrl: input.logoUrl ?? null,
      website: input.website ?? null,
      isActive: true,
      onChainActive: true,
      chainAddedAt: new Date(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("duplicate key")) {
      throw new HttpError(409, "ISSUER_EXISTS", "Mã hoặc ví đã tồn tại");
    }

    throw error;
  }

  if (user) {
    try {
      user.walletAddress = wallet;
      await user.save();
    } catch (error) {
      await Issuer.deleteOne({ _id: issuer._id }).catch(() => undefined);
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("duplicate key")) {
        throw new HttpError(409, "WALLET_IN_USE", "Ví đã được dùng cho tài khoản khác");
      }

      throw error;
    }
  }

  return toIssuerDTO(issuer);
}

export class IssuerService extends CertificateService {
  confirmCertificate = confirmCertificate;
  listIssuerCertificates = listIssuerCertificates;
  prepareCertificate = prepareCertificate;
}

export const issuerService = new IssuerService();

export interface PreparedCertificate {
  cid: string;
  fileHash: string;
  sizeBytes: number;
  templateId: string;
  templateVersion: string;
  filename: string;
}

export async function prepareCertificate(
  input: PrepareCertificateInput,
  issuer: IssuerDocument
): Promise<PreparedCertificate> {
  const existing = await Certificate.findOne({
    certificateId: input.certificateId,
  });

  if (existing) {
    throw new HttpError(409, "CERTIFICATE_EXISTS", "Mã chứng chỉ đã tồn tại");
  }

  const baseUrl = env.FRONTEND_ORIGIN.split(",")[0]
    .trim()
    .replace(/\/$/, "");

  const pdf = await certificatePdfService.generate({
    certificateType: input.certificateType,
    certificateId: input.certificateId,
    studentName: input.studentName,
    studentCode: input.studentCode,
    issuedAt: new Date(),
    issuerName: issuer.name,
    verifyUrl: `${baseUrl}/c/${input.certificateId}`,
    details: input.details as CertificateDetails,
  });

  const fileHash = sha256Buffer(pdf.buffer);
  const pin = await pinataService.pinFileToIPFS(
    pdf.buffer,
    pdf.filename,
    "application/pdf"
  );

  return {
    cid: pin.cid,
    fileHash,
    sizeBytes: pdf.buffer.length,
    templateId: pdf.templateId,
    templateVersion: pdf.templateVersion,
    filename: pdf.filename,
  };
}

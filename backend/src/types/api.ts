import type {
  ArtifactType,
  CertificateDetails,
  CertificateStatus,
  CertificateType,
} from "./certificate";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "issuer";
  walletAddress: string | null;
}

export interface IssuerDTO {
  id: string;
  name: string;
  code: string;
  walletAddress: string;
  logoUrl: string | null;
  website: string | null;
  isActive: boolean;
  onChainActive: boolean;
}

export interface CertificateSummaryDTO {
  certificateId: string;
  certificateType: CertificateType;
  studentName: string;
  studentCode: string;
  major: string | null;
  graduationYear: number | null;
  gpa: number | null;
  classification: string | null;
  issuedAt: string;
  status: CertificateStatus;
  verifyUrl: string;
}

export interface CertificateDetailDTO extends CertificateSummaryDTO {
  details: CertificateDetails;
  templateId: string;
  templateVersion: string;
  issuerName: string;
  artifactType: ArtifactType;
  mimeType: string;
  filename: string;
  sizeBytes: number;
  ipfsCid: string;
  txHash: string;
  blockNumber: number;
  statusSource: "chain";
}

export interface RecentCertificateDTO {
  certificateId: string;
  studentNameMasked: string;
  studentCodeMasked: string;
  major: string | null;
  graduationYear: number | null;
  issuedAt: string;
  status: CertificateStatus;
  txHash: string;
  blockNumber: number;
}

export interface CertificateIssuerDTO {
  certificateId: string;
  certificateType: CertificateType;
  studentName: string;
  studentCode: string;
  major: string | null;
  graduationYear: number | null;
  gpa: number | null;
  classification: string | null;
  artifactType: ArtifactType;
  filename: string;
  status: CertificateStatus;
  issuedAt: string;
  txHash: string;
  revokedAt: string | null;
  revokeTxHash: string | null;
}

export type Role = 'admin' | 'issuer';
export type CertificateStatus = 'active' | 'revoked';
export type CertificateType = 'degree' | 'course' | 'credit' | 'other';
export type ArtifactType = 'pdf' | 'image' | 'web';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  walletAddress: string | null;
}

export interface Issuer {
  id: string;
  name: string;
  code: string;
  walletAddress: string;
  logoUrl: string | null;
  website: string | null;
  isActive: boolean;
  onChainActive: boolean;
}

export interface CertificateSummary {
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

export interface CertificateDetail extends CertificateSummary {
  details: Record<string, unknown>;
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
  statusSource: 'chain';
}

export interface RecentCertificate {
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

export interface CertificateIssuer {
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

export interface AdminStats {
  certificates: { total: number; active: number; revoked: number };
  issuers: { total: number; active: number };
  users: number;
  byType: Record<CertificateType, number>;
  recent: Array<{
    certificateId: string;
    studentName: string;
    studentCode: string;
    certificateType: CertificateType;
    status: string;
    issuedAt: string;
  }>;
}

export interface FilterOptions {
  years: number[];
  majors: string[];
  types: CertificateType[];
}

export interface VerifyHashResult {
  exists: boolean;
  valid: boolean;
  certificateId: string | null;
  issuer: string | null;
  issuedAt: string | null;
  certificate: CertificateDetail | null;
}

export interface PrepareCertificateResponse {
  cid: string;
  fileHash: string;
  sizeBytes: number;
  templateId: string;
  templateVersion: string;
  filename: string;
}

import type { CertificateDetails, CertificateType } from "../../types/certificate";

export interface CertificatePdfInput {
  certificateType: CertificateType;
  certificateId: string;
  studentName: string;
  studentCode: string;
  issuedAt: Date;
  issuerName: string;
  verifyUrl: string;
  details: CertificateDetails;
}

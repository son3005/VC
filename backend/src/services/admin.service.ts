import { Certificate, Issuer, User } from "../models";
import type { CertificateType } from "../types/certificate";
import {
  createIssuer as createIssuerFn,
  deactivateIssuer as deactivateIssuerFn,
  IssuerService,
  listIssuers as listIssuersFn,
} from "./issuer.service";
import { backfillEvents, getSyncStatus } from "./sync.service";

export interface AdminStats {
  certificates: {
    total: number;
    active: number;
    revoked: number;
    locked: number;
  };
  issuers: {
    total: number;
    active: number;
  };
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

export async function getAdminStats(): Promise<AdminStats> {
  const [
    total,
    active,
    revoked,
    locked,
    totalIssuers,
    activeIssuers,
    users,
    byTypeAgg,
    recent,
  ] = await Promise.all([
    Certificate.countDocuments({}),
    Certificate.countDocuments({ status: "active" }),
    Certificate.countDocuments({ status: "revoked" }),
    Certificate.countDocuments({ status: "locked" }),
    Issuer.countDocuments({}),
    Issuer.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: true }),
    Certificate.aggregate<{ _id: CertificateType; count: number }>([
      { $group: { _id: "$certificateType", count: { $sum: 1 } } },
    ]),
    Certificate.find({}).sort({ issuedAt: -1 }).limit(5),
  ]);

  const byType: Record<CertificateType, number> = {
    degree: 0,
    course: 0,
    credit: 0,
    other: 0,
  };

  for (const row of byTypeAgg) {
    byType[row._id] = row.count;
  }

  return {
    certificates: { total, active, revoked, locked },
    issuers: { total: totalIssuers, active: activeIssuers },
    users,
    byType,
    recent: recent.map((cert) => ({
      certificateId: cert.certificateId,
      studentName: cert.studentName,
      studentCode: cert.studentCode,
      certificateType: cert.certificateType,
      status: cert.status,
      issuedAt: cert.issuedAt.toISOString(),
    })),
  };
}

/**
 * Admin kế thừa toàn bộ nghiệp vụ issuer (cấp/thu hồi/xem chứng chỉ)
 * và bổ sung quản trị hệ thống.
 */
export class AdminService extends IssuerService {
  getStats = getAdminStats;
  listIssuers = listIssuersFn;
  createIssuer = createIssuerFn;
  deactivateIssuer = deactivateIssuerFn;
  syncStatus = getSyncStatus;
  syncEvents = backfillEvents;
}

export const adminService = new AdminService();

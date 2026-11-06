/**
 * @file admin.service.ts
 * @description Dịch vụ quản trị hệ thống trung tâm (Central Administration Service).
 * 
 * Các vai trò kiến trúc cốt lõi:
 * 1. Thu thập và tổng hợp chỉ số thống kê đa chiều (Multi-dimensional Dashboard Analytics):
 *    - Sử dụng `Promise.all` để truy vấn song song (Parallel Execution) 9 tác vụ đếm, gom nhóm và sắp xếp.
 *    - Gom nhóm phân loại chứng chỉ bằng MongoDB Aggregation Pipeline (`$group`).
 *    - Khởi tạo giá trị mặc định (Zeroed Fallback) đảm bảo tính toàn vẹn của dữ liệu thống kê.
 * 2. Kiến trúc kế thừa phân quyền (Hierarchical Service Architecture):
 *    - Lớp `AdminService` kế thừa trực tiếp từ `IssuerService`, cho phép Quản trị viên (Super-admin)
 *      sở hữu toàn bộ quyền hạn của một đơn vị phát hành (cấp bằng, thu hồi, khóa, kết xuất PDF...)
 *      đồng thời mở rộng thêm các năng lực quản trị cấp cao:
 *      + Quản lý danh mục và phân quyền đơn vị cấp phát (`IssuerManagement`).
 *      + Giám sát và kích hoạt tiến trình đồng bộ sự kiện Blockchain (`SyncManagement`).
 * 3. Xuất bản thể hiện đơn thể (Singleton Pattern) `adminService` cho toàn ứng dụng.
 */

import { Certificate, Issuer, User } from "../models";
import type { CertificateType } from "../types/certificate";
import {
  createIssuer as createIssuerFn,
  deactivateIssuer as deactivateIssuerFn,
  IssuerService,
  listIssuers as listIssuersFn,
} from "./issuer.service";
import { backfillEvents, getSyncStatus } from "./sync.service";

/**
 * Giao diện cấu trúc dữ liệu thống kê tổng quan của Bảng điều khiển Quản trị (Admin Dashboard Statistics)
 */
export interface AdminStats {
  /** Thống kê số lượng văn bằng theo trạng thái vòng đời */
  certificates: {
    total: number;
    active: number;
    revoked: number;
    locked: number;
  };
  /** Thống kê số lượng đơn vị cấp phát (Issuer) */
  issuers: {
    total: number;
    active: number;
  };
  /** Tổng số tài khoản người dùng đang hoạt động trong hệ thống */
  users: number;
  /** Số lượng văn bằng phân bổ theo từng loại chứng chỉ (degree, course, credit, other) */
  byType: Record<CertificateType, number>;
  /** Danh sách 5 văn bằng được phát hành gần đây nhất */
  recent: Array<{
    certificateId: string;
    studentName: string;
    studentCode: string;
    certificateType: CertificateType;
    status: string;
    issuedAt: string;
  }>;
}

/**
 * Thu thập và tổng hợp toàn bộ số liệu thống kê quản trị từ cơ sở dữ liệu
 * 
 * Tối ưu hóa hiệu năng bằng cách thực thi song song toàn bộ 9 câu lệnh truy vấn qua `Promise.all`:
 * - 4 truy vấn đếm trạng thái văn bằng (total, active, revoked, locked)
 * - 2 truy vấn đếm đơn vị cấp phát (total, active)
 * - 1 truy vấn đếm người dùng (active users)
 * - 1 truy vấn tổng hợp phân nhóm (aggregate $group by certificateType)
 * - 1 truy vấn lấy danh sách văn bằng gần nhất kèm sắp xếp (sort by issuedAt desc)
 * 
 * @returns {Promise<AdminStats>} Đối tượng dữ liệu thống kê hoàn chỉnh
 */
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

  // Khởi tạo bảng đếm với giá trị 0 cho toàn bộ các phân loại chứng chỉ hợp lệ
  const byType: Record<CertificateType, number> = {
    degree: 0,
    course: 0,
    credit: 0,
    other: 0,
  };

  // Điền dữ liệu thực tế từ kết quả Aggregation Pipeline
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
 * Lớp dịch vụ Quản trị viên (AdminService)
 * 
 * Thiết kế theo mô hình Kế thừa mở rộng:
 * - Kế thừa toàn bộ năng lực của `IssuerService` (phát hành, thu hồi, tạm khóa, tra cứu văn bằng).
 * - Bổ sung các năng lực quản trị đặc quyền của hệ thống:
 *   + Thống kê chỉ số: `getStats`
 *   + Quản lý đơn vị phát hành: `listIssuers`, `createIssuer`, `deactivateIssuer`
 *   + Giám sát & đồng bộ Blockchain: `syncStatus`, `syncEvents`
 */
export class AdminService extends IssuerService {
  /** Lấy dữ liệu báo cáo thống kê tổng quan */
  getStats = getAdminStats;

  /** Liệt kê danh sách các đơn vị cấp phát kèm phân trang và tìm kiếm */
  listIssuers = listIssuersFn;

  /** Khởi tạo đơn vị cấp phát mới (kèm cơ chế onboard tài khoản kép XOR) */
  createIssuer = createIssuerFn;

  /** Vô hiệu hóa đơn vị cấp phát trên cơ sở dữ liệu và xác nhận qua giao dịch chuỗi */
  deactivateIssuer = deactivateIssuerFn;

  /** Lấy trạng thái đồng bộ khối và mốc kiểm soát checkpoint hiện tại */
  syncStatus = getSyncStatus;

  /** Kích hoạt quét và lập chỉ mục bổ sung các sự kiện Blockchain trong dải khối */
  syncEvents = backfillEvents;
}

/** Thể hiện Singleton duy nhất của AdminService được sử dụng trong toàn bộ controllers */
export const adminService = new AdminService();

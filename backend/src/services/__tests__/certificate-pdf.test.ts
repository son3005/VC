/**
 * @file certificate-pdf.test.ts
 * @description Kiểm thử tích hợp (Integration Tests) cho dịch vụ kết xuất tệp PDF chứng chỉ (CertificatePdfService).
 * 
 * Bộ kiểm thử bao gồm:
 * 1. Kiểm tra kết xuất thành công tệp PDF cho cả 4 phân loại chứng chỉ (`degree`, `course`, `credit`, `other`):
 *    - Xác thực Magic Bytes của chuẩn PDF (`%PDF-` ở 5 bytes đầu tiên của buffer).
 *    - Đảm bảo dung lượng buffer tối thiểu (> 10,000 bytes) thể hiện tài liệu hoàn chỉnh kèm hình ảnh, font chữ và QR code.
 *    - Kiểm tra cấu trúc metadata: templateId, templateVersion, và tên tệp chuẩn (`<certificateId>.pdf`).
 * 2. Hỗ trợ hiển thị bảng mã ký tự tiếng Việt có dấu (Vietnamese Diacritics) mà không làm phát sinh ngoại lệ hay lỗi font.
 */

import { certificatePdfService } from "../certificate-pdf";
import type { CertificatePdfInput } from "../certificate-pdf/types";

/** Dữ liệu cơ sở cho mẫu PDF */
const base = {
  studentName: "Nguyễn Văn An",
  studentCode: "2311095",
  issuedAt: new Date("2026-10-19T08:00:00.000Z"),
  issuerName: "Khoa Công nghệ Thông tin",
};

/**
 * Hàm trợ giúp khởi tạo đối tượng CertificatePdfInput cho từng loại chứng chỉ
 */
function make(
  certificateType: CertificatePdfInput["certificateType"],
  certificateId: string,
  details: CertificatePdfInput["details"]
): CertificatePdfInput {
  return {
    ...base,
    certificateType,
    certificateId,
    details,
    verifyUrl: `https://vc.example.edu/c/${certificateId}`,
  };
}

/** Danh sách 4 mẫu dữ liệu tương ứng với 4 loại văn bằng chứng chỉ */
const samples: CertificatePdfInput[] = [
  make("degree", "UIT-DEG-2026-0001", {
    degreeTitle: "Cử nhân",
    major: "Kỹ thuật phần mềm",
    graduationYear: 2026,
    gpa: 3.45,
    classification: "Giỏi",
  }),
  make("course", "UIT-CRS-2026-0142", {
    courseCode: "CS409",
    courseName: "Lập trình Blockchain",
    credits: 3,
    semester: "HK1 2025–2026",
    grade: 8.5,
    gradeScale: "10",
    grade4: 3.4,
  }),
  make("credit", "UIT-CRE-2026-0035", {
    programName: "Kỹ thuật phần mềm",
    totalCredits: 132,
    completedCredits: 128,
    gradeScale: "10",
    modules: [
      { code: "CS101", name: "Nhập môn lập trình", credits: 4, grade: 8.5 },
    ],
  }),
  make("other", "UIT-OTH-2026-0007", {
    title: "CHỨNG NHẬN THAM GIA",
    description: "đã tham gia và hoàn thành Blockchain Workshop 2026",
  }),
];

describe("CertificatePdfService", () => {
  /**
   * Test case 1..4: Tạo tệp PDF hợp lệ cho từng phân loại chứng chỉ
   * Sử dụng it.each để duyệt qua danh sách samples và kiểm tra:
   * - Magic bytes: '%PDF-'
   * - Dung lượng buffer > 10,000 bytes
   * - TemplateId chuẩn theo loại bằng
   * - Tên tệp đúng định dạng
   */
  it.each(samples)(
    "generates a valid $certificateType PDF",
    async (input) => {
      const result = await certificatePdfService.generate(input);

      expect(result.buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
      expect(result.buffer.length).toBeGreaterThan(10_000);
      expect(result.templateId).toBe(
        `${input.certificateType}-v1`
      );
      expect(result.templateVersion).toBe("1.0.0");
      expect(result.filename).toBe(`${input.certificateId}.pdf`);
    }
  );

  /**
   * Test case 5: Kết xuất văn bản tiếng Việt có dấu đầy đủ mà không gây lỗi runtime
   * Đảm bảo font chữ tích hợp (như Roboto hoặc BeVietnamPro) hiển thị chính xác các ký tự tiếng Việt đặc thù.
   */
  it("renders Vietnamese diacritics without throwing", async () => {
    const result = await certificatePdfService.generate(
      make("degree", "UIT-DEG-2026-0002", {
        degreeTitle: "Cử nhân",
        major: "Kỹ thuật phần mềm",
        graduationYear: 2026,
        gpa: 3.5,
        classification: "Giỏi",
      })
    );

    expect(result.buffer.length).toBeGreaterThan(10_000);
  });
});

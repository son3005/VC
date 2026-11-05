/**
 * @file certificate.test.ts
 * @description Kiểm thử đơn vị (Unit Tests) cho bộ quy tắc xác thực dữ liệu chứng chỉ:
 * - `prepareCertificateSchema`: Kiểm tra tính toàn vẹn của dữ liệu văn bằng ở bước tạo nháp (Draft),
 *   bao gồm xác thực đa hình (Polymorphic Validation) theo từng loại chứng chỉ (`degree`, `course`, `credit`, `other`),
 *   tiền tố mã chứng chỉ (certificateId prefix), thang điểm (GPA / Grade), và quan hệ logic giữa các trường dữ liệu.
 * - `confirmCertificateSchema`: Kiểm tra dữ liệu khi xác nhận phát hành chứng chỉ lên Blockchain & IPFS,
 *   yêu cầu đầy đủ chữ ký số file (SHA-256 hash), CID IPFS hợp lệ và Transaction Hash Ethereum.
 */

import {
  confirmCertificateSchema,
  prepareCertificateSchema,
} from "../certificate";

/**
 * Dữ liệu cơ sở cho sinh viên sở hữu chứng chỉ
 */
const base = {
  studentName: "Nguyễn Văn An",
  studentCode: "2311095",
};

/**
 * Mẫu dữ liệu hợp lệ cho văn bằng cử nhân/kỹ sư (Degree)
 */
const degree = {
  certificateType: "degree" as const,
  certificateId: "UIT-DEG-2026-0001",
  ...base,
  details: {
    degreeTitle: "Cử nhân",
    major: "Kỹ thuật phần mềm",
    graduationYear: 2026,
    gpa: 3.45,
    classification: "Giỏi",
  },
};

describe("prepareCertificateSchema", () => {
  /**
   * Test case 1: Chấp nhận dữ liệu văn bằng tốt nghiệp (Degree) hợp lệ
   * Kiểm tra đầy đủ cấu trúc: studentName, studentCode, certificateId đúng định dạng UIT-DEG-*,
   * và details phù hợp với degreeDetailsSchema.
   */
  it("accepts a valid degree", () => {
    expect(prepareCertificateSchema.safeParse(degree).success).toBe(true);
  });

  /**
   * Test case 2: Chấp nhận dữ liệu chứng chỉ môn học/học phần (Course Certificate) hợp lệ
   * Xác thực certificateType 'course' đi kèm tiền tố 'UIT-CRS-*' và các thông tin chi tiết
   * như mã môn học, tên môn, số tín chỉ, học kỳ, điểm số và thang điểm 10.
   */
  it("accepts a valid course", () => {
    const result = prepareCertificateSchema.safeParse({
      certificateType: "course",
      certificateId: "UIT-CRS-2026-0142",
      ...base,
      details: {
        courseCode: "CS409",
        courseName: "Lập trình Blockchain",
        credits: 3,
        semester: "HK1 2025–2026",
        grade: 8.5,
        gradeScale: "10",
      },
    });

    expect(result.success).toBe(true);
  });

  /**
   * Test case 3: Chấp nhận dữ liệu chứng chỉ tích lũy tín chỉ (Credit Certificate) hợp lệ
   * Xác thực certificateType 'credit' đi kèm tiền tố 'UIT-CRE-*' cùng các trường
   * tổng tín chỉ chương trình và số tín chỉ đã hoàn thành.
   */
  it("accepts a valid credit certificate", () => {
    const result = prepareCertificateSchema.safeParse({
      certificateType: "credit",
      certificateId: "UIT-CRE-2026-0035",
      ...base,
      details: {
        programName: "Kỹ thuật phần mềm",
        totalCredits: 132,
        completedCredits: 128,
        gradeScale: "10",
      },
    });

    expect(result.success).toBe(true);
  });

  /**
   * Test case 4: Chấp nhận chứng chỉ các hoạt động khác (Other/Workshop Certificate)
   * Xác thực certificateType 'other' đi kèm tiền tố 'UIT-OTH-*' và tiêu đề mô tả hoạt động.
   */
  it("accepts a valid other certificate", () => {
    const result = prepareCertificateSchema.safeParse({
      certificateType: "other",
      certificateId: "UIT-OTH-2026-0007",
      ...base,
      details: {
        title: "CHỨNG NHẬN THAM GIA",
        description: "Blockchain Workshop 2026",
      },
    });

    expect(result.success).toBe(true);
  });

  /**
   * Test case 5: Từ chối nếu mã chứng chỉ không khớp tiền tố loại chứng chỉ
   * Ví dụ: Loại văn bằng 'degree' nhưng mã lại có tiền tố môn học 'UIT-CRS-*'
   * Quy tắc nghiệp vụ yêu cầu định danh phải đồng nhất với phân loại văn bằng.
   */
  it("rejects a certificate id with the wrong prefix", () => {
    const result = prepareCertificateSchema.safeParse({
      ...degree,
      certificateId: "UIT-CRS-2026-0001",
    });

    expect(result.success).toBe(false);
  });

  /**
   * Test case 6: Từ chối điểm GPA vượt quá thang điểm chuẩn 4.0
   * Thang điểm đại học hệ 4 tối đa là 4.0; nếu nhập 4.5 phải bị bắt lỗi tại tầng schema.
   */
  it("rejects GPA above 4", () => {
    const result = prepareCertificateSchema.safeParse({
      ...degree,
      details: { ...degree.details, gpa: 4.5 },
    });

    expect(result.success).toBe(false);
  });

  /**
   * Test case 7: Từ chối điểm môn học vượt quá thang điểm 10
   * Khi chọn gradeScale là '10', điểm số không được vượt quá 10.0.
   */
  it("rejects a grade above 10", () => {
    const result = prepareCertificateSchema.safeParse({
      certificateType: "course",
      certificateId: "UIT-CRS-2026-0142",
      ...base,
      details: {
        courseCode: "CS409",
        courseName: "Lập trình Blockchain",
        credits: 3,
        semester: "HK1",
        grade: 11,
        gradeScale: "10",
      },
    });

    expect(result.success).toBe(false);
  });

  /**
   * Test case 8: Từ chối số tín chỉ hoàn thành lớn hơn tổng tín chỉ chương trình
   * Đảm bảo tính ràng buộc quan hệ: completedCredits <= totalCredits.
   */
  it("rejects completedCredits greater than totalCredits", () => {
    const result = prepareCertificateSchema.safeParse({
      certificateType: "credit",
      certificateId: "UIT-CRE-2026-0035",
      ...base,
      details: {
        programName: "Kỹ thuật phần mềm",
        totalCredits: 100,
        completedCredits: 120,
        gradeScale: "10",
      },
    });

    expect(result.success).toBe(false);
  });

  /**
   * Test case 9: Từ chối mã số sinh viên quá ngắn (không đủ độ dài quy định)
   * studentCodeSchema quy định MSSV phải gồm 6–12 ký tự số. '123' chỉ có 3 ký tự nên bị từ chối.
   */
  it("rejects a short student code", () => {
    const result = prepareCertificateSchema.safeParse({
      ...degree,
      studentCode: "123",
    });

    expect(result.success).toBe(false);
  });
});

describe("confirmCertificateSchema", () => {
  /**
   * Test case 10: Chấp nhận payload xác nhận phát hành đầy đủ thông tin kỹ thuật
   * Bao gồm mã băm file SHA-256 (định dạng 'sha256:<64 hex>'), IPFS CID (Qm... hoặc bafy...),
   * loại định dạng artifact ('pdf'), mimeType, dung lượng byte và mã giao dịch Blockchain (txHash).
   */
  it("accepts a full confirmation payload", () => {
    const result = confirmCertificateSchema.safeParse({
      ...degree,
      fileHash: "sha256:" + "a".repeat(64),
      ipfsCid: "QmUtYcoXUvXcWyAY7wBWHupxfPH4AKADKFeQK5DnbAKN8A",
      artifactType: "pdf",
      mimeType: "application/pdf",
      filename: "cert.pdf",
      sizeBytes: 497,
      templateId: "degree-v1",
      templateVersion: "1.0.0",
      txHash: "0x" + "b".repeat(64),
    });

    expect(result.success).toBe(true);
  });

  /**
   * Test case 11: Từ chối mã băm file không đúng định dạng quy định
   * Hệ thống chỉ chấp nhận hash định dạng SHA-256 ('sha256:[a-f0-9]{64}'),
   * từ chối các thuật toán lỗi thời hoặc không an toàn như MD5 ('md5:...').
   */
  it("rejects an invalid file hash", () => {
    const result = confirmCertificateSchema.safeParse({
      ...degree,
      fileHash: "md5:abc",
      ipfsCid: "QmUtYcoXUvXcWyAY7wBWHupxfPH4AKADKFeQK5DnbAKN8A",
      artifactType: "pdf",
      mimeType: "application/pdf",
      filename: "cert.pdf",
      sizeBytes: 497,
      templateId: "degree-v1",
      templateVersion: "1.0.0",
      txHash: "0x" + "b".repeat(64),
    });

    expect(result.success).toBe(false);
  });
});

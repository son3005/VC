import { certificatePdfService } from "../certificate-pdf";
import type { CertificatePdfInput } from "../certificate-pdf/types";

const base = {
  studentName: "Nguyễn Văn An",
  studentCode: "2311095",
  issuedAt: new Date("2026-10-19T08:00:00.000Z"),
  issuerName: "Khoa Công nghệ Thông tin",
};

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

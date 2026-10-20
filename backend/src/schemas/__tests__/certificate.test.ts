import {
  confirmCertificateSchema,
  prepareCertificateSchema,
} from "../certificate";

const base = {
  studentName: "Nguyễn Văn An",
  studentCode: "2311095",
};

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
  it("accepts a valid degree", () => {
    expect(prepareCertificateSchema.safeParse(degree).success).toBe(true);
  });

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

  it("rejects a certificate id with the wrong prefix", () => {
    const result = prepareCertificateSchema.safeParse({
      ...degree,
      certificateId: "UIT-CRS-2026-0001",
    });

    expect(result.success).toBe(false);
  });

  it("rejects GPA above 4", () => {
    const result = prepareCertificateSchema.safeParse({
      ...degree,
      details: { ...degree.details, gpa: 4.5 },
    });

    expect(result.success).toBe(false);
  });

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

  it("rejects a short student code", () => {
    const result = prepareCertificateSchema.safeParse({
      ...degree,
      studentCode: "123",
    });

    expect(result.success).toBe(false);
  });
});

describe("confirmCertificateSchema", () => {
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

import type { CertificatePdfInput } from "../types";
import type { DegreeDetails } from "../../../types/certificate";
import { COLORS, FONT, PAGE } from "../common/layout";

export function drawDegree(doc: PDFKit.PDFDocument, input: CertificatePdfInput): void {
  const details = input.details as DegreeDetails;

  doc
    .fillColor(COLORS.muted)
    .font(FONT.body)
    .fontSize(10)
    .text(
      "đã hoàn thành chương trình đào tạo trình độ đại học",
      42,
      205,
      { width: PAGE.width - 84, align: "center" }
    );

  doc
    .fillColor(COLORS.navy)
    .font(FONT.bold)
    .fontSize(14)
    .text(`${details.degreeTitle} — ${details.major}`, 42, 235, {
      width: PAGE.width - 84,
      align: "center",
    });

  const rows = [
    ["Ngành", details.major],
    ["Năm tốt nghiệp", String(details.graduationYear)],
    [
      "GPA",
      `${details.gpa.toFixed(2)}/4.00`,
    ],
    ["Xếp loại", details.classification],
    ["Hình thức", details.studyMode ?? "Chính quy"],
  ];

  let y = 270;
  for (const [label, value] of rows) {
    doc
      .fillColor(COLORS.muted)
      .font(FONT.body)
      .fontSize(8)
      .text(label, 190, y, { width: 110, align: "right" });

    doc
      .fillColor(COLORS.navy)
      .font(FONT.semibold)
      .fontSize(9)
      .text(value, 315, y, { width: 330 });

    y += 17;
  }

  if (details.thesisTitle) {
    doc
      .fillColor(COLORS.muted)
      .font(FONT.body)
      .fontSize(7.5)
      .text(`Khóa luận: ${details.thesisTitle}`, 42, 372, {
        width: PAGE.width - 84,
        align: "center",
      });
  }
}

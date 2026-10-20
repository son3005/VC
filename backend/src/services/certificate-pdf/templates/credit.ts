import type { CertificatePdfInput } from "../types";
import type { CreditDetails } from "../../../types/certificate";
import { COLORS, FONT, PAGE, formatGrade } from "../common/layout";

export function drawCredit(doc: PDFKit.PDFDocument, input: CertificatePdfInput): void {
  const details = input.details as CreditDetails;

  doc
    .fillColor(COLORS.muted)
    .font(FONT.body)
    .fontSize(9)
    .text("Chương trình", 42, 202, {
      width: PAGE.width - 84,
      align: "center",
    });

  doc
    .fillColor(COLORS.navy)
    .font(FONT.bold)
    .fontSize(13)
    .text(details.programName, 42, 216, {
      width: PAGE.width - 84,
      align: "center",
    });

  const stats = [
    `Tổng tín chỉ: ${details.totalCredits}`,
    `Đã tích lũy: ${details.completedCredits}`,
    details.gpa !== undefined ? `GPA: ${details.gpa.toFixed(2)}/4.00` : null,
  ].filter(Boolean) as string[];

  doc
    .fillColor(COLORS.navy)
    .font(FONT.semibold)
    .fontSize(9)
    .text(stats.join("     •     "), 42, 242, {
      width: PAGE.width - 84,
      align: "center",
    });

  if (!details.modules || details.modules.length === 0) return;

  const left = 152;
  const width = PAGE.width - 304;
  const top = 264;
  const rowHeight = 14;

  doc
    .rect(left, top, width, 16)
    .fill(COLORS.navy);

  doc
    .fillColor(COLORS.background)
    .font(FONT.semibold)
    .fontSize(6.5)
    .text("Mã môn", left + 6, top + 4, { width: 54 })
    .text("Tên môn", left + 64, top + 4, { width: 230 })
    .text("Tín chỉ", left + 300, top + 4, { width: 42, align: "right" })
    .text("Điểm", left + 348, top + 4, { width: 58, align: "right" });

  details.modules.slice(0, 8).forEach((module, index) => {
    const y = top + 18 + index * rowHeight;

    if (index % 2 === 1) {
      doc.rect(left, y - 2, width, rowHeight).fill("#F3EAD2");
    }

    doc
      .fillColor(COLORS.navy)
      .font(FONT.body)
      .fontSize(6.5)
      .text(module.code, left + 6, y, { width: 54 })
      .text(module.name, left + 64, y, { width: 230, ellipsis: true })
      .text(String(module.credits), left + 300, y, {
        width: 42,
        align: "right",
      })
      .text(
        formatGrade(module.grade, details.gradeScale, module.grade4),
        left + 348,
        y,
        { width: 58, align: "right" }
      );
  });
}

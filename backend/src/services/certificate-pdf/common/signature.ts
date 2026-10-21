import path from "node:path";
import type { CertificatePdfInput } from "../types";
import { COLORS, FONT, PAGE, formatDate } from "./layout";

export function drawSignature(
  doc: PDFKit.PDFDocument,
  input: CertificatePdfInput
): void {
  const { width } = PAGE;
  const y = 405;

  doc
    .fillColor(COLORS.muted)
    .font(FONT.body)
    .fontSize(7.5)
    .text("Ngày cấp", 42, y, { width: 180 });

  doc
    .fillColor(COLORS.navy)
    .font(FONT.semibold)
    .fontSize(9)
    .text(formatDate(input.issuedAt), 42, y + 10, { width: 180 });

  doc
    .fillColor(COLORS.navy)
    .font(FONT.semibold)
    .fontSize(8.5)
    .text(input.issuerName, 42, y + 40, { width: 190 });

  doc
    .fillColor(COLORS.muted)
    .font(FONT.body)
    .fontSize(7)
    .text("Đơn vị cấp", 42, y + 53, { width: 190 });

  doc.image(path.join(__dirname, "..", "assets", "seal.png"), width / 2 - 32, y + 10, {
    fit: [64, 64],
  });

  doc
    .fillColor(COLORS.navy)
    .font(FONT.semibold)
    .fontSize(8.5)
    .text("HIỆU TRƯỞNG", width - 232, y + 40, {
      width: 190,
      align: "center",
    });

  doc
    .moveTo(width - 200, y + 64)
    .lineTo(width - 74, y + 64)
    .lineWidth(0.5)
    .strokeColor(COLORS.muted)
    .stroke();

  doc
    .fillColor(COLORS.muted)
    .font(FONT.body)
    .fontSize(6.5)
    .text("(Ký, đóng dấu)", width - 232, y + 68, {
      width: 190,
      align: "center",
    });
}

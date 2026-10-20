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

  const sealX = width / 2;
  const sealY = y + 28;

  doc
    .circle(sealX, sealY, 34)
    .lineWidth(1.2)
    .strokeColor(COLORS.gold)
    .stroke();

  doc
    .circle(sealX, sealY, 29)
    .lineWidth(0.5)
    .strokeColor(COLORS.navy)
    .stroke();

  doc
    .fillColor(COLORS.navy)
    .font(FONT.bold)
    .fontSize(7)
    .text("XÁC NHẬN", sealX - 30, sealY - 8, {
      width: 60,
      align: "center",
    });

  doc
    .fillColor(COLORS.muted)
    .font(FONT.body)
    .fontSize(6)
    .text("ĐIỆN TỬ", sealX - 30, sealY + 2, {
      width: 60,
      align: "center",
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

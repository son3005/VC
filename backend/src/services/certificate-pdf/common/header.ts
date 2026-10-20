import type { CertificatePdfInput } from "../types";
import { COLORS, FONT, PAGE } from "./layout";

export function drawHeader(
  doc: PDFKit.PDFDocument,
  input: CertificatePdfInput
): void {
  const { width } = PAGE;

  doc.circle(66, 60, 21).fill(COLORS.navy);
  doc
    .fillColor(COLORS.background)
    .font(FONT.bold)
    .fontSize(9)
    .text("UIT", 51, 55, { width: 30, align: "center" });

  doc
    .fillColor(COLORS.navy)
    .font(FONT.bold)
    .fontSize(13)
    .text("TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN", 98, 42, {
      width: 470,
    });

  doc
    .fillColor(COLORS.muted)
    .font(FONT.body)
    .fontSize(8)
    .text("ĐẠI HỌC QUỐC GIA THÀNH PHỐ HỒ CHÍ MINH", 98, 61, {
      width: 470,
    });

  doc
    .fillColor(COLORS.muted)
    .font(FONT.body)
    .fontSize(8)
    .text("Số chứng chỉ", width - 280, 40, { width: 230, align: "right" });

  doc
    .fillColor(COLORS.navy)
    .font(FONT.semibold)
    .fontSize(9)
    .text(input.certificateId, width - 280, 52, {
      width: 230,
      align: "right",
    });

  doc
    .moveTo(98, 80)
    .lineTo(width - 42, 80)
    .lineWidth(0.75)
    .strokeColor(COLORS.gold)
    .stroke();
}

import path from "node:path";
import type { CertificatePdfInput } from "../types";
import { COLORS, FONT, PAGE } from "./layout";

export function drawHeader(
  doc: PDFKit.PDFDocument,
  input: CertificatePdfInput
): void {
  const { width } = PAGE;

  doc.image(path.join(__dirname, "..", "assets", "logo.png"), 44, 34, {
    fit: [44, 44],
  });

  doc
    .fillColor(COLORS.navy)
    .font(FONT.bold)
    .fontSize(13)
    .text("RACCOON UNIVERSITY", 98, 38, {
      width: 470,
    });

  doc
    .fillColor(COLORS.muted)
    .font(FONT.body)
    .fontSize(8)
    .text("LEARN & FORAGE", 98, 58, {
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

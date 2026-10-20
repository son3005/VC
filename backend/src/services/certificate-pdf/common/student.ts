import type { CertificatePdfInput } from "../types";
import { COLORS, FONT, PAGE } from "./layout";

export function drawTitle(doc: PDFKit.PDFDocument, title: string): void {
  doc
    .fillColor(COLORS.navy)
    .font(FONT.bold)
    .fontSize(21)
    .text(title, 42, 98, {
      width: PAGE.width - 84,
      align: "center",
      characterSpacing: 1.2,
    });

  doc
    .moveTo(PAGE.width / 2 - 42, 126)
    .lineTo(PAGE.width / 2 + 42, 126)
    .lineWidth(1.4)
    .strokeColor(COLORS.gold)
    .stroke();
}

export function drawStudent(
  doc: PDFKit.PDFDocument,
  input: CertificatePdfInput
): void {
  doc
    .fillColor(COLORS.navy)
    .font(FONT.bold)
    .fontSize(26)
    .text(input.studentName, 42, 143, {
      width: PAGE.width - 84,
      align: "center",
    });

  doc
    .fillColor(COLORS.muted)
    .font(FONT.body)
    .fontSize(9)
    .text(`MSSV: ${input.studentCode}`, 42, 178, {
      width: PAGE.width - 84,
      align: "center",
    });
}

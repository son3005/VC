import type { CertificatePdfInput } from "../types";
import type { OtherDetails } from "../../../types/certificate";
import { COLORS, FONT, PAGE } from "../common/layout";

export function drawOther(doc: PDFKit.PDFDocument, input: CertificatePdfInput): void {
  const details = input.details as OtherDetails;

  doc
    .fillColor(COLORS.navy)
    .font(FONT.body)
    .fontSize(10)
    .text(details.description, 92, 205, {
      width: PAGE.width - 184,
      align: "center",
      lineGap: 3,
    });

  const rows: Array<[string, string]> = [];
  if (details.organizer) rows.push(["Tổ chức", details.organizer]);
  if (details.eventDate) rows.push(["Thời gian", details.eventDate]);
  if (details.role) rows.push(["Vai trò", details.role]);
  if (details.result) rows.push(["Kết quả", details.result]);
  if (details.validUntil) rows.push(["Giá trị đến", details.validUntil]);

  let y = 290;
  for (const [label, value] of rows) {
    doc
      .fillColor(COLORS.muted)
      .font(FONT.body)
      .fontSize(8)
      .text(label, 220, y, { width: 100, align: "right" });

    doc
      .fillColor(COLORS.navy)
      .font(FONT.semibold)
      .fontSize(9)
      .text(value, 335, y, { width: 290 });

    y += 17;
  }
}

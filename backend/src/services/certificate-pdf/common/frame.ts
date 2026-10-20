import { COLORS, PAGE } from "./layout";

function drawCorner(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  dx: number,
  dy: number
): void {
  doc
    .moveTo(x, y + dy * 26)
    .lineTo(x, y)
    .lineTo(x + dx * 26, y)
    .lineWidth(1.2)
    .strokeColor(COLORS.gold)
    .stroke();

  doc
    .moveTo(x + dx * 7, y + dy * 15)
    .lineTo(x + dx * 7, y + dy * 7)
    .lineTo(x + dx * 15, y + dy * 7)
    .lineWidth(0.6)
    .strokeColor(COLORS.navy)
    .stroke();
}

export function drawFrame(doc: PDFKit.PDFDocument): void {
  doc.rect(0, 0, PAGE.width, PAGE.height).fill(COLORS.background);

  doc
    .lineWidth(2)
    .strokeColor(COLORS.gold)
    .rect(20, 20, PAGE.width - 40, PAGE.height - 40)
    .stroke();

  doc
    .lineWidth(0.75)
    .strokeColor(COLORS.navy)
    .rect(26, 26, PAGE.width - 52, PAGE.height - 52)
    .stroke();

  drawCorner(doc, 34, 34, 1, 1);
  drawCorner(doc, PAGE.width - 34, 34, -1, 1);
  drawCorner(doc, 34, PAGE.height - 34, 1, -1);
  drawCorner(doc, PAGE.width - 34, PAGE.height - 34, -1, -1);
}

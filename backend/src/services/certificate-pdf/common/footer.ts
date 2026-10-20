import QRCode from "qrcode";
import type { CertificatePdfInput } from "../types";
import { COLORS, FONT, PAGE } from "./layout";

export async function drawFooter(
  doc: PDFKit.PDFDocument,
  input: CertificatePdfInput
): Promise<void> {
  const { width, height } = PAGE;

  doc
    .moveTo(42, height - 118)
    .lineTo(width - 42, height - 118)
    .lineWidth(0.5)
    .strokeColor(COLORS.gold)
    .stroke();

  const qr = await QRCode.toBuffer(input.verifyUrl, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 4,
    width: 256,
    color: {
      dark: COLORS.navy,
      light: COLORS.background,
    },
  });

  doc.image(qr, 46, height - 108, { width: 64, height: 64 });

  doc
    .fillColor(COLORS.muted)
    .font(FONT.semibold)
    .fontSize(7)
    .text("TRA CỨU TẠI", 126, height - 106, { width: 300 });

  doc
    .fillColor(COLORS.navy)
    .font(FONT.body)
    .fontSize(7.5)
    .text(input.verifyUrl, 126, height - 96, { width: 420 });

  doc
    .fillColor(COLORS.muted)
    .font(FONT.body)
    .fontSize(6.5)
    .text(
      "Chứng chỉ chỉ có giá trị khi tra cứu tại đường dẫn trên và thấy trạng thái hợp lệ.",
      126,
      height - 82,
      { width: 430 }
    );
}

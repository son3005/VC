import path from "node:path";

const FONT_FILES = {
  body: "BeVietnamPro-Regular.ttf",
  semibold: "BeVietnamPro-SemiBold.ttf",
  bold: "BeVietnamPro-Bold.ttf",
};

export function registerFonts(doc: PDFKit.PDFDocument): void {
  for (const [name, file] of Object.entries(FONT_FILES)) {
    doc.registerFont(
      name,
      path.join(__dirname, "..", "assets", "fonts", file)
    );
  }
}

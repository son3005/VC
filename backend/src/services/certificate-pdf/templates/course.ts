import type { CertificatePdfInput } from "../types";
import type { CourseDetails } from "../../../types/certificate";
import { COLORS, FONT, PAGE, formatGrade } from "../common/layout";

export function drawCourse(doc: PDFKit.PDFDocument, input: CertificatePdfInput): void {
  const details = input.details as CourseDetails;

  doc
    .fillColor(COLORS.muted)
    .font(FONT.body)
    .fontSize(10)
    .text("đã hoàn thành khóa học", 42, 205, {
      width: PAGE.width - 84,
      align: "center",
    });

  doc
    .fillColor(COLORS.navy)
    .font(FONT.bold)
    .fontSize(17)
    .text(`“${details.courseName}”`, 42, 228, {
      width: PAGE.width - 84,
      align: "center",
    });

  const rows: Array<[string, string]> = [
    ["Mã môn", details.courseCode],
    ["Số tín chỉ", String(details.credits)],
    ["Học kỳ", details.semester],
    [
      "Điểm",
      formatGrade(details.grade, details.gradeScale, details.grade4),
    ],
  ];

  if (details.durationHours) {
    rows.push(["Thời lượng", `${details.durationHours} giờ`]);
  }

  if (details.instructor) {
    rows.push(["Giảng viên", details.instructor]);
  }

  let y = 270;
  for (const [label, value] of rows) {
    doc
      .fillColor(COLORS.muted)
      .font(FONT.body)
      .fontSize(8)
      .text(label, 190, y, { width: 110, align: "right" });

    doc
      .fillColor(COLORS.navy)
      .font(FONT.semibold)
      .fontSize(9)
      .text(value, 315, y, { width: 330 });

    y += 17;
  }
}

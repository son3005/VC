import type { CertificateType } from "../../types/certificate";

export const TEMPLATE_VERSION = "1.0.0";

export const TEMPLATE_IDS: Record<CertificateType, string> = {
  degree: "degree-v1",
  course: "course-v1",
  credit: "credit-v1",
  other: "other-v1",
};

export const TEMPLATE_TITLES: Record<CertificateType, string> = {
  degree: "CHỨNG NHẬN TỐT NGHIỆP",
  course: "CHỨNG CHỈ HOÀN THÀNH KHÓA HỌC",
  credit: "CHỨNG NHẬN TÍN CHỈ",
  other: "CHỨNG NHẬN",
};

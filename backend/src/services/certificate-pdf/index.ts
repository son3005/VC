import PDFDocument from "pdfkit";
import type { CertificateType } from "../../types/certificate";
import type { OtherDetails } from "../../types/certificate";
import { drawFooter } from "./common/footer";
import { registerFonts } from "./common/fonts";
import { drawFrame } from "./common/frame";
import { drawHeader } from "./common/header";
import { drawSignature } from "./common/signature";
import { drawStudent, drawTitle } from "./common/student";
import { TEMPLATE_IDS, TEMPLATE_TITLES, TEMPLATE_VERSION } from "./template";
import { drawCourse } from "./templates/course";
import { drawCredit } from "./templates/credit";
import { drawDegree } from "./templates/degree";
import { drawOther } from "./templates/other";
import type { CertificatePdfInput } from "./types";

type Renderer = (doc: PDFKit.PDFDocument, input: CertificatePdfInput) => void;

const RENDERERS: Record<CertificateType, Renderer> = {
  degree: drawDegree,
  course: drawCourse,
  credit: drawCredit,
  other: drawOther,
};

export interface GeneratedPdf {
  buffer: Buffer;
  templateId: string;
  templateVersion: string;
  filename: string;
}

export class CertificatePdfService {
  async generate(input: CertificatePdfInput): Promise<GeneratedPdf> {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 0,
      info: {
        Title: `Chứng nhận ${input.certificateId}`,
        Author: input.issuerName,
        Subject: TEMPLATE_TITLES[input.certificateType],
        Keywords: `${input.certificateType},${input.certificateId}`,
        CreationDate: input.issuedAt,
        ModDate: input.issuedAt,
        Producer: "VerifyCert/1.0",
        Creator: "VerifyCert",
      },
    });

    const chunks: Buffer[] = [];
    const completed = new Promise<Buffer>((resolve, reject) => {
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    registerFonts(doc);
    drawFrame(doc);
    drawHeader(doc, input);

    const title =
      input.certificateType === "other"
        ? (input.details as OtherDetails).title
        : TEMPLATE_TITLES[input.certificateType];

    drawTitle(doc, title);
    drawStudent(doc, input);
    RENDERERS[input.certificateType](doc, input);
    drawSignature(doc, input);

    await drawFooter(doc, input);

    doc.end();
    const buffer = await completed;

    return {
      buffer,
      templateId: TEMPLATE_IDS[input.certificateType],
      templateVersion: TEMPLATE_VERSION,
      filename: `${input.certificateId}.pdf`,
    };
  }
}

export const certificatePdfService = new CertificatePdfService();

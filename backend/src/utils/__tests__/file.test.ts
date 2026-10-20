import { detectMime } from "../file";

describe("detectMime", () => {
  it("detects PDF", () => {
    expect(detectMime(Buffer.from("%PDF-1.7\n..."))).toEqual({
      mimeType: "application/pdf",
      extension: "pdf",
    });
  });

  it("detects PNG", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(detectMime(png)).toEqual({
      mimeType: "image/png",
      extension: "png",
    });
  });

  it("detects JPEG", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    expect(detectMime(jpeg)).toEqual({
      mimeType: "image/jpeg",
      extension: "jpg",
    });
  });

  it("rejects plain text", () => {
    expect(detectMime(Buffer.from("not a document"))).toBeNull();
  });

  it("rejects renamed executables", () => {
    expect(detectMime(Buffer.from([0x4d, 0x5a, 0x90, 0x00]))).toBeNull();
  });
});

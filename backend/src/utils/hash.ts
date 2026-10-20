import { createHash } from "node:crypto";

export function sha256Buffer(buffer: Buffer): string {
  const hex = createHash("sha256").update(buffer).digest("hex");
  return `sha256:${hex}`;
}

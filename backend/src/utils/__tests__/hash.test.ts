import { sha256Buffer } from "../hash";

describe("sha256Buffer", () => {
  it("returns the known SHA-256 of 'hello'", () => {
    expect(sha256Buffer(Buffer.from("hello"))).toBe(
      "sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("always uses the sha256: prefix and lowercase hex", () => {
    const hash = sha256Buffer(Buffer.from("Verify Certification"));
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("changes when one byte changes", () => {
    const a = sha256Buffer(Buffer.from("abc"));
    const b = sha256Buffer(Buffer.from("abd"));
    expect(a).not.toBe(b);
  });
});

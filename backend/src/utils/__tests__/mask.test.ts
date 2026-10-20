import { maskCode, maskName } from "../mask";

describe("maskName", () => {
  it("masks middle and last names", () => {
    expect(maskName("Nguyễn Văn An")).toBe("Nguyễn V. A.");
  });

  it("handles two-part names", () => {
    expect(maskName("Trần Bình")).toBe("Trần B.");
  });

  it("keeps single-part names unchanged", () => {
    expect(maskName("An")).toBe("An");
  });
});

describe("maskCode", () => {
  it("keeps first four characters", () => {
    expect(maskCode("2311095")).toBe("2311***");
  });

  it("masks very short codes completely", () => {
    expect(maskCode("123")).toBe("***");
  });
});

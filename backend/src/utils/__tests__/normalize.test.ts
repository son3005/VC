import { normalizeText } from "../normalize";

describe("normalizeText", () => {
  it("removes Vietnamese diacritics", () => {
    expect(normalizeText("Nguyễn Văn An")).toBe("nguyen van an");
  });

  it("normalizes đ/Đ", () => {
    expect(normalizeText("Đặng Đình Đức")).toBe("dang dinh duc");
  });

  it("lowercases and collapses spaces", () => {
    expect(normalizeText("  LÊ   THỊ   HỒNG  ")).toBe("le thi hong");
  });

  it("keeps empty string", () => {
    expect(normalizeText("")).toBe("");
  });
});

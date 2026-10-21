import { createIssuerSchema } from "../issuer";

const base = {
  name: "Khoa Công nghệ Thông tin",
  code: "CNTT",
  walletAddress: "0xf009863379F6B0056C1D828fDE2827fD94202a1B",
  txHash: "0x" + "a".repeat(64),
};

describe("createIssuerSchema", () => {
  it("accepts a new issuer account with email and password", () => {
    const result = createIssuerSchema.safeParse({
      ...base,
      email: "issuer@fit.uit.edu.vn",
      password: "StrongPass123",
    });

    expect(result.success).toBe(true);
  });

  it("accepts an existing user by userId", () => {
    const result = createIssuerSchema.safeParse({
      ...base,
      userId: "65a1b2c3d4e5f6a7b8c9d0e1",
    });

    expect(result.success).toBe(true);
  });

  it("rejects when neither userId nor email/password is provided", () => {
    const result = createIssuerSchema.safeParse(base);
    expect(result.success).toBe(false);
  });

  it("rejects when both userId and email/password are provided", () => {
    const result = createIssuerSchema.safeParse({
      ...base,
      userId: "65a1b2c3d4e5f6a7b8c9d0e1",
      email: "issuer@fit.uit.edu.vn",
      password: "StrongPass123",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a weak password", () => {
    const result = createIssuerSchema.safeParse({
      ...base,
      email: "issuer@fit.uit.edu.vn",
      password: "123",
    });

    expect(result.success).toBe(false);
  });
});

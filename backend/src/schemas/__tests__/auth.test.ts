import { loginSchema } from "../auth";

describe("loginSchema", () => {
  it("normalizes email and wallet addresses", () => {
    const result = loginSchema.parse({
      email: "  Admin@VerifyCert.Local ",
      password: "Admin@123456",
      walletAddress: "0x9B8DF93F172AAEB67C31BE257C9E4A55A8DF1B3B",
    });

    expect(result.email).toBe("admin@verifycert.local");
    expect(result.walletAddress).toBe("0x9b8df93f172aaeb67c31be257c9e4a55a8df1b3b");
  });

  it("requires a wallet address", () => {
    const result = loginSchema.safeParse({
      email: "admin@verifycert.local",
      password: "Admin@123456",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a malformed wallet address", () => {
    const result = loginSchema.safeParse({
      email: "admin@verifycert.local",
      password: "Admin@123456",
      walletAddress: "not-a-wallet",
    });

    expect(result.success).toBe(false);
  });
});

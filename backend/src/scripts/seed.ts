import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "../config/db";
import { Issuer, User } from "../models";

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? "admin@verifycert.local")
  .trim()
  .toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";
const ISSUER_EMAIL = (
  process.env.SEED_ISSUER_EMAIL ?? "issuer@verifycert.local"
)
  .trim()
  .toLowerCase();
const ISSUER_PASSWORD = process.env.SEED_ISSUER_PASSWORD ?? "";
const ISSUER_WALLET = (process.env.ISSUER_WALLET_ADDRESS ?? "")
  .trim()
  .toLowerCase();

const ISSUER_NAME = "Khoa Công nghệ Thông tin";
const ISSUER_CODE = "CNTT";

async function seed(): Promise<void> {
  if (!ADMIN_PASSWORD || !ISSUER_PASSWORD) {
    throw new Error(
      "Thiếu SEED_ADMIN_PASSWORD hoặc SEED_ISSUER_PASSWORD trong .env"
    );
  }

  if (!ISSUER_WALLET) {
    throw new Error("Thiếu ISSUER_WALLET_ADDRESS trong .env");
  }

  if (!/^0x[a-f0-9]{40}$/.test(ISSUER_WALLET)) {
    throw new Error("ISSUER_WALLET_ADDRESS không hợp lệ");
  }

  await connectDB();

  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const issuerPasswordHash = await bcrypt.hash(ISSUER_PASSWORD, 10);

  // Admin không gắn ví để tránh trùng unique với issuer.
  const admin = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      $set: {
        passwordHash: adminPasswordHash,
        role: "admin",
        displayName: "Phòng đào tạo",
        walletAddress: null,
        isActive: true,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  const issuerUser = await User.findOneAndUpdate(
    { email: ISSUER_EMAIL },
    {
      $set: {
        passwordHash: issuerPasswordHash,
        role: "issuer",
        displayName: ISSUER_NAME,
        walletAddress: ISSUER_WALLET,
        isActive: true,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  const issuer = await Issuer.findOneAndUpdate(
    { code: ISSUER_CODE },
    {
      $set: {
        name: ISSUER_NAME,
        walletAddress: ISSUER_WALLET,
        userId: issuerUser._id,
        isActive: true,
        onChainActive: true,
        chainAddedAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  const maskedWallet = `${ISSUER_WALLET.slice(0, 6)}...${ISSUER_WALLET.slice(-4)}`;

  console.log("[seed] done");
  console.log(`  admin:  ${admin.email} (role=admin)`);
  console.log(`  issuer: ${issuerUser.email} (role=issuer, wallet=${maskedWallet})`);
  console.log(`  issuer doc: ${issuer.code} — ${issuer.name}`);
}

seed()
  .catch((error) => {
    console.error("[seed] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB().catch(() => undefined);
  });

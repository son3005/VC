import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB: z.string().min(1).default("verify_cert"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  CHAIN_ID: z.coerce.number().int().positive().default(11155111),
  SEPOLIA_RPC_URL: z.string().url("SEPOLIA_RPC_URL must be a valid URL"),
  CONTRACT_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "CONTRACT_ADDRESS must be a valid address"),
  DEPLOY_BLOCK: z.coerce.number().int().nonnegative().default(0),

  FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
  PINATA_JWT: z.string().optional(),
  PINATA_GATEWAY: z.string().url().default("https://gateway.pinata.cloud/ipfs/"),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(5),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  RENDER_EXTERNAL_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");

  console.error("[env] Invalid environment variables:\n" + details);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

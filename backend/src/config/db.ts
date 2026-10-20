import mongoose from "mongoose";
import { env } from "./env";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2_000;

/**
 * Kết nối MongoDB Atlas với retry + backoff.
 * Không log URI vì có chứa password.
 */
export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        dbName: env.MONGODB_DB,
        serverSelectionTimeoutMS: 10_000,
      });

      console.log(`[db] connected: ${mongoose.connection.name}`);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[db] attempt ${attempt}/${MAX_RETRIES} failed: ${message}`);

      if (attempt === MAX_RETRIES) {
        throw new Error("Cannot connect to MongoDB after multiple attempts");
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

export type DBStatus =
  | "disconnected"
  | "connected"
  | "connecting"
  | "disconnecting"
  | "unknown";

export function getDBStatus(): DBStatus {
  switch (mongoose.connection.readyState) {
    case 0:
      return "disconnected";
    case 1:
      return "connected";
    case 2:
      return "connecting";
    case 3:
      return "disconnecting";
    default:
      return "unknown";
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  console.log("[db] disconnected");
}

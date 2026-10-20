import type { UserRole } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        walletAddress: string | null;
      };
    }
  }
}

export {};

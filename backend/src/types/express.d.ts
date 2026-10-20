import type { IssuerDocument, UserRole } from "../models";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        walletAddress: string | null;
      };
      issuer?: IssuerDocument;
    }
  }
}

export {};

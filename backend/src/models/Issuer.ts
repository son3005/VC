import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";

export interface IIssuer {
  name: string;
  code: string;
  walletAddress: string;
  userId?: Types.ObjectId | null;
  logoUrl?: string | null;
  website?: string | null;
  isActive: boolean;
  onChainActive: boolean;
  chainAddedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type IssuerDocument = HydratedDocument<IIssuer>;

const issuerSchema = new Schema<IIssuer>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
      match: /^[A-Z0-9_-]+$/,
    },
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: /^0x[a-f0-9]{40}$/,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    logoUrl: {
      type: String,
      default: null,
      maxlength: 300,
    },
    website: {
      type: String,
      default: null,
      maxlength: 300,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    onChainActive: {
      type: Boolean,
      default: false,
    },
    chainAddedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

issuerSchema.index({ code: 1 }, { unique: true });
issuerSchema.index({ walletAddress: 1 }, { unique: true });
issuerSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $type: "objectId" } },
  }
);

export const Issuer: Model<IIssuer> = model<IIssuer>("Issuer", issuerSchema);

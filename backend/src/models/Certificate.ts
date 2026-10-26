import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import type {
  ArtifactType,
  CertificateDetails,
  CertificateStatus,
  CertificateType,
} from "../types/certificate";

export interface ICertificate {
  certificateId: string;
  certificateIdHash?: string | null;
  certificateType: CertificateType;
  details: CertificateDetails;

  templateId: string;
  templateVersion: string;

  fileHash: string;
  ipfsCid: string;
  artifactType: ArtifactType;
  mimeType: string;
  filename: string;
  sizeBytes: number;
  previewCid?: string | null;

  issuerId: Types.ObjectId;
  issuerWallet: string;
  issuerName: string;

  studentName: string;
  studentNameNormalized: string;
  studentCode: string;
  major?: string | null;
  majorNormalized?: string | null;
  graduationYear?: number | null;
  gpa?: number | null;
  classification?: string | null;

  issuedAt: Date;
  txHash: string;
  blockNumber: number;
  logIndex: number;

  status: CertificateStatus;
  revokedAt?: Date | null;
  revokeTxHash?: string | null;
  revokeBlockNumber?: number | null;

  lockedAt?: Date | null;
  lockTxHash?: string | null;
  lockBlockNumber?: number | null;

  metadataHash?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export type CertificateDocument = HydratedDocument<ICertificate>;

const certificateSchema = new Schema<ICertificate>(
  {
    certificateId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
      match: /^[A-Z0-9-]+$/,
    },
    certificateIdHash: {
      type: String,
      default: null,
      lowercase: true,
      match: /^0x[a-f0-9]{64}$/,
    },
    certificateType: {
      type: String,
      required: true,
      enum: ["degree", "course", "credit", "other"],
    },
    details: {
      type: Schema.Types.Mixed,
      required: true,
    },

    templateId: {
      type: String,
      required: true,
      maxlength: 40,
    },
    templateVersion: {
      type: String,
      required: true,
      maxlength: 20,
    },

    fileHash: {
      type: String,
      required: true,
      match: /^sha256:[a-f0-9]{64}$/,
    },
    ipfsCid: {
      type: String,
      required: true,
      maxlength: 100,
    },
    artifactType: {
      type: String,
      required: true,
      enum: ["pdf", "image", "web"],
      default: "pdf",
    },
    mimeType: {
      type: String,
      required: true,
      maxlength: 100,
    },
    filename: {
      type: String,
      required: true,
      maxlength: 120,
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 1,
    },
    previewCid: {
      type: String,
      default: null,
      maxlength: 100,
    },

    issuerId: {
      type: Schema.Types.ObjectId,
      ref: "Issuer",
      required: true,
    },
    issuerWallet: {
      type: String,
      required: true,
      lowercase: true,
      match: /^0x[a-f0-9]{40}$/,
    },
    issuerName: {
      type: String,
      required: true,
      maxlength: 100,
    },

    studentName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    studentNameNormalized: {
      type: String,
      required: true,
      maxlength: 100,
    },
    studentCode: {
      type: String,
      required: true,
      match: /^[0-9]{6,12}$/,
    },
    major: {
      type: String,
      default: null,
      maxlength: 100,
    },
    majorNormalized: {
      type: String,
      default: null,
      maxlength: 100,
    },
    graduationYear: {
      type: Number,
      default: null,
      min: 2000,
      max: 2100,
    },
    gpa: {
      type: Number,
      default: null,
      min: 0,
      max: 4,
    },
    classification: {
      type: String,
      default: null,
      maxlength: 50,
    },

    issuedAt: {
      type: Date,
      required: true,
    },
    txHash: {
      type: String,
      required: true,
      lowercase: true,
      match: /^0x[a-f0-9]{64}$/,
    },
    blockNumber: {
      type: Number,
      required: true,
      min: 0,
    },
    logIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      required: true,
      enum: ["active", "revoked", "locked"],
      default: "active",
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokeTxHash: {
      type: String,
      default: null,
      lowercase: true,
    },
    revokeBlockNumber: {
      type: Number,
      default: null,
    },

    lockedAt: {
      type: Date,
      default: null,
    },
    lockTxHash: {
      type: String,
      default: null,
      lowercase: true,
    },
    lockBlockNumber: {
      type: Number,
      default: null,
    },

    metadataHash: {
      type: String,
      default: null,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

certificateSchema.index({ certificateId: 1 }, { unique: true });
certificateSchema.index(
  { certificateIdHash: 1 },
  {
    unique: true,
    partialFilterExpression: { certificateIdHash: { $type: "string" } },
  }
);
certificateSchema.index({ fileHash: 1 }, { unique: true });
certificateSchema.index({ txHash: 1 }, { unique: true });

certificateSchema.index({ issuerWallet: 1, issuedAt: -1 });
certificateSchema.index({ studentCode: 1 });
certificateSchema.index({ status: 1, issuedAt: -1 });
certificateSchema.index({ certificateType: 1, issuedAt: -1 });
certificateSchema.index({ graduationYear: 1, majorNormalized: 1, issuedAt: -1 });
certificateSchema.index({ issuedAt: -1 });

certificateSchema.index(
  { studentNameNormalized: "text", majorNormalized: "text" },
  { name: "certificate_text_search", default_language: "none" }
);

export const Certificate: Model<ICertificate> = model<ICertificate>(
  "Certificate",
  certificateSchema
);

import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
} from "mongoose";

export type ChainEventType =
  | "CertificateIssued"
  | "CertificateRevoked"
  | "IssuerUpdated";

export interface IChainEvent {
  txHash: string;
  logIndex: number;
  blockNumber: number;
  eventType: ChainEventType;
  payload: Record<string, unknown>;
  contractAddress: string;
  processedAt: Date;
  createdAt: Date;
}

export type ChainEventDocument = HydratedDocument<IChainEvent>;

const chainEventSchema = new Schema<IChainEvent>(
  {
    txHash: {
      type: String,
      required: true,
      lowercase: true,
      match: /^0x[a-f0-9]{64}$/,
    },
    logIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    blockNumber: {
      type: Number,
      required: true,
      min: 0,
    },
    eventType: {
      type: String,
      required: true,
      enum: ["CertificateIssued", "CertificateRevoked", "IssuerUpdated"],
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    contractAddress: {
      type: String,
      required: true,
      lowercase: true,
      match: /^0x[a-f0-9]{40}$/,
    },
    processedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

chainEventSchema.index({ txHash: 1, logIndex: 1 }, { unique: true });
chainEventSchema.index({ blockNumber: 1 });
chainEventSchema.index({ eventType: 1, blockNumber: -1 });

export const ChainEvent: Model<IChainEvent> = model<IChainEvent>(
  "ChainEvent",
  chainEventSchema
);

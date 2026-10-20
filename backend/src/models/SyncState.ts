import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
} from "mongoose";

export interface ISyncState {
  key: string;
  chainId: number;
  contractAddress: string;
  lastSyncedBlock: number;
  createdAt: Date;
  updatedAt: Date;
}

export type SyncStateDocument = HydratedDocument<ISyncState>;

const syncStateSchema = new Schema<ISyncState>(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    chainId: {
      type: Number,
      required: true,
      min: 1,
    },
    contractAddress: {
      type: String,
      required: true,
      lowercase: true,
      match: /^0x[a-f0-9]{40}$/,
    },
    lastSyncedBlock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

syncStateSchema.index({ key: 1 }, { unique: true });

export const SyncState: Model<ISyncState> = model<ISyncState>(
  "SyncState",
  syncStateSchema
);

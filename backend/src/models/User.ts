import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
} from "mongoose";

export type UserRole = "admin" | "issuer";

export interface IUser {
  email: string;
  passwordHash: string;
  role: UserRole;
  displayName: string;
  walletAddress?: string | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 150,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: ["admin", "issuer"],
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    walletAddress: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index(
  { walletAddress: 1 },
  {
    unique: true,
    partialFilterExpression: { walletAddress: { $type: "string" } },
  }
);

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete (ret as { passwordHash?: string }).passwordHash;
    return ret;
  },
});

export const User: Model<IUser> = model<IUser>("User", userSchema);

import mongoose from "mongoose";

export interface IApiKey {
  orgId: mongoose.Types.ObjectId;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  status: "active" | "revoked";
}

export interface IApiKeyDocument extends IApiKey, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new mongoose.Schema<IApiKeyDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    keyPrefix: { type: String, required: true },
    keyHash: { type: String, required: true, index: true },
    scopes: [{ type: String, default: ["read"] }],
    expiresAt: { type: Date },
    lastUsedAt: { type: Date },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
    },
  },
  { timestamps: true },
);

apiKeySchema.index({ orgId: 1, status: 1 });

const ApiKey = mongoose.model<IApiKeyDocument>("ApiKey", apiKeySchema);
export default ApiKey;

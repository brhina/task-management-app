import mongoose from "mongoose";

export interface ISSOConfig {
  orgId: mongoose.Types.ObjectId;
  enabled: boolean;
  provider: "saml" | "oidc";
  issuerUrl?: string;
  entryPoint?: string;
  certificate?: string;
  domainWhitelist: string[];
  jitProvisioning: boolean;
  defaultRole: "OrgAdmin" | "OrgMember";
  createdBy: mongoose.Types.ObjectId;
}

export interface ISSOConfigDocument extends ISSOConfig, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const ssoConfigSchema = new mongoose.Schema<ISSOConfigDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
      index: true,
    },
    enabled: { type: Boolean, default: false },
    provider: {
      type: String,
      enum: ["saml", "oidc"],
      default: "saml",
    },
    issuerUrl: { type: String, trim: true, default: "" },
    entryPoint: { type: String, trim: true, default: "" },
    certificate: { type: String, trim: true, default: "" },
    domainWhitelist: [{ type: String, lowercase: true, trim: true }],
    jitProvisioning: { type: Boolean, default: true },
    defaultRole: {
      type: String,
      enum: ["OrgAdmin", "OrgMember"],
      default: "OrgMember",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

const SSOConfig = mongoose.model<ISSOConfigDocument>(
  "SSOConfig",
  ssoConfigSchema,
);
export default SSOConfig;

import mongoose from "mongoose";

export interface IOrganizationBranding {
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  customTitle?: string;
  customFavicon?: string;
  whiteLabelEnabled?: boolean;
}

export interface ISecurityPolicy {
  enforce2FA?: boolean;
  sessionTimeoutMinutes?: number;
  ipAllowlistEnabled?: boolean;
}

export interface IOrganization {
  name: string;
  slug: string;
  plan?: "Free" | "Pro" | "Enterprise";
  createdBy: mongoose.Types.ObjectId;
  branding?: IOrganizationBranding;
  ipAllowlist?: string[];
  securityPolicy?: ISecurityPolicy;
  billingEmail?: string;
  billingContact?: string;
  poNumber?: string;
  billingCycle?: "monthly" | "yearly";
  telebirrPhone?: string;
  telebirrAutoRenew?: boolean;
  currency?: string;
  subscriptionStatus?: "active" | "past_due" | "canceled" | "none";
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  /** Set when workspace was created with paid intent; cleared after Telebirr confirm */
  pendingPlan?: "Pro" | "Enterprise" | null;
}

export interface IOrganizationDocument
  extends IOrganization, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new mongoose.Schema<IOrganizationDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    plan: {
      type: String,
      enum: ["Free", "Pro", "Enterprise"],
      default: "Free",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    branding: {
      logoUrl: { type: String, default: "" },
      primaryColor: { type: String, default: "#6366F1" },
      accentColor: { type: String, default: "#8B5CF6" },
      customTitle: { type: String, default: "" },
      customFavicon: { type: String, default: "" },
      whiteLabelEnabled: { type: Boolean, default: false },
    },
    ipAllowlist: [{ type: String }],
    securityPolicy: {
      enforce2FA: { type: Boolean, default: false },
      sessionTimeoutMinutes: { type: Number, default: 60 },
      ipAllowlistEnabled: { type: Boolean, default: false },
    },
    billingEmail: { type: String, default: "" },
    billingContact: { type: String, default: "" },
    poNumber: { type: String, default: "" },
    billingCycle: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    telebirrPhone: { type: String, default: "" },
    telebirrAutoRenew: { type: Boolean, default: true },
    currency: { type: String, default: "ETB" },
    subscriptionStatus: {
      type: String,
      enum: ["active", "past_due", "canceled", "none"],
      default: "none",
    },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    pendingPlan: {
      type: String,
      enum: ["Pro", "Enterprise"],
    },
  },
  { timestamps: true },
);

const Organization = mongoose.model<IOrganizationDocument>(
  "Organization",
  organizationSchema,
);

export default Organization;

import mongoose from "mongoose";

export interface IOrganizationBranding {
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  customTitle?: string;
  whiteLabelEnabled?: boolean;
}

export interface IOrganization {
  name: string;
  slug: string;
  plan?: "Free" | "Pro" | "Enterprise";
  createdBy: mongoose.Types.ObjectId;
  branding?: IOrganizationBranding;
  ipAllowlist?: string[];
  billingEmail?: string;
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
      whiteLabelEnabled: { type: Boolean, default: false },
    },
    ipAllowlist: [{ type: String }],
    billingEmail: { type: String, default: "" },
  },
  { timestamps: true },
);

const Organization = mongoose.model<IOrganizationDocument>(
  "Organization",
  organizationSchema,
);

export default Organization;

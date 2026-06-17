import mongoose from "mongoose";

export interface IOrganization {
  name: string;
  slug: string;
  plan?: "Free" | "Pro" | "Enterprise";
  createdBy: mongoose.Types.ObjectId;
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
  },
  { timestamps: true },
);

const Organization = mongoose.model<IOrganizationDocument>(
  "Organization",
  organizationSchema,
);

export default Organization;

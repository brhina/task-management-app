import mongoose from "mongoose";

export type OrgRole = "OrgAdmin" | "OrgMember";

export interface IOrgMembership {
  orgId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: OrgRole;
  status: "Active" | "Invited" | "Suspended";
  capacityHoursPerWeek?: number;
}

export interface IOrgMembershipDocument
  extends IOrgMembership, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const orgMembershipSchema = new mongoose.Schema<IOrgMembershipDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["OrgAdmin", "OrgMember"],
      default: "OrgMember",
    },
    status: {
      type: String,
      enum: ["Active", "Invited", "Suspended"],
      default: "Active",
    },
    capacityHoursPerWeek: {
      type: Number,
      required: false,
      min: 1,
      default: 40,
    },
  },
  { timestamps: true },
);

orgMembershipSchema.index({ orgId: 1, userId: 1 }, { unique: true });

const OrgMembership = mongoose.model<IOrgMembershipDocument>(
  "OrgMembership",
  orgMembershipSchema,
);

export default OrgMembership;

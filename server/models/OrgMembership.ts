import mongoose from "mongoose";
import {
  SYSTEM_ROLES,
  type OrgRole,
} from "../constants/permissions.js";

export type { OrgRole };

export interface IOrgMembership {
  orgId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: OrgRole;
  customRoleId?: mongoose.Types.ObjectId;
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
      enum: [...SYSTEM_ROLES, "Custom"],
      default: "OrgMember",
    },
    customRoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomRole",
      required: false,
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

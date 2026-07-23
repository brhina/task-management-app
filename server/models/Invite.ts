import mongoose from "mongoose";
import { SYSTEM_ROLES, type OrgRole } from "../constants/permissions.js";

export interface IInvite {
  orgId: mongoose.Types.ObjectId;
  email?: string;
  token: string;
  role: OrgRole;
  customRoleId?: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

export interface IInviteDocument extends IInvite, mongoose.Document {
  createdAt: Date;
}

const inviteSchema = new mongoose.Schema<IInviteDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
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
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

const Invite = mongoose.model<IInviteDocument>("Invite", inviteSchema);

export default Invite;

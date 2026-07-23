import mongoose from "mongoose";
import { PERMISSIONS, type Permission } from "../constants/permissions.js";

export interface ICustomRole {
  orgId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
  createdBy: mongoose.Types.ObjectId;
}

export interface ICustomRoleDocument extends ICustomRole, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const customRoleSchema = new mongoose.Schema<ICustomRoleDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    permissions: [
      {
        type: String,
        enum: PERMISSIONS,
      },
    ],
    isSystem: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

customRoleSchema.index({ orgId: 1, name: 1 }, { unique: true });

const CustomRole = mongoose.model<ICustomRoleDocument>(
  "CustomRole",
  customRoleSchema,
);

export default CustomRole;

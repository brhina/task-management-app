import mongoose from "mongoose";

export interface IInvite {
  orgId: mongoose.Types.ObjectId;
  email?: string;
  token: string;
  role: "OrgAdmin" | "OrgMember";
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
      enum: ["OrgAdmin", "OrgMember"],
      default: "OrgMember",
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

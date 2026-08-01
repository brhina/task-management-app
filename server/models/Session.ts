import mongoose from "mongoose";

export interface ISession {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  ipAddress: string;
  userAgent: string;
  lastActive: Date;
  status: "active" | "revoked";
}

export interface ISessionDocument extends ISession, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new mongoose.Schema<ISessionDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, index: true },
    ipAddress: { type: String, default: "127.0.0.1" },
    userAgent: { type: String, default: "Unknown Browser" },
    lastActive: { type: Date, default: () => new Date() },
    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

const Session = mongoose.model<ISessionDocument>("Session", sessionSchema);
export default Session;

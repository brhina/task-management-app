import mongoose from "mongoose";

export type DependencyType = "FS" | "SS" | "FF";
export type DependencyStatus = "Active" | "Resolved";

export interface IDependency {
  orgId: mongoose.Types.ObjectId;
  fromTaskId: mongoose.Types.ObjectId; // prerequisite
  toTaskId: mongoose.Types.ObjectId; // dependent
  type: DependencyType;
  lagHours?: number;
  status: DependencyStatus;
}

export interface IDependencyDocument extends IDependency, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const dependencySchema = new mongoose.Schema<IDependencyDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    fromTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    toTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["FS", "SS", "FF"],
      default: "FS",
    },
    lagHours: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Active", "Resolved"],
      default: "Active",
      index: true,
    },
  },
  { timestamps: true },
);

dependencySchema.index(
  { orgId: 1, fromTaskId: 1, toTaskId: 1, type: 1 },
  { unique: true },
);

const Dependency = mongoose.model<IDependencyDocument>(
  "Dependency",
  dependencySchema,
);

export default Dependency;

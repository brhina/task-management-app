import mongoose from "mongoose";

export type SprintStatus = "Planned" | "Active" | "Completed" | "Cancelled";

export interface ISprint {
  orgId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  name: string;
  startDate: Date;
  endDate: Date;
  goalIds?: mongoose.Types.ObjectId[];
  capacityHours?: number;
  status: SprintStatus;
  createdBy: mongoose.Types.ObjectId;
}

export interface ISprintDocument extends ISprint, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const sprintSchema = new mongoose.Schema<ISprintDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    goalIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Goal" }],
    capacityHours: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ["Planned", "Active", "Completed", "Cancelled"],
      default: "Planned",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

sprintSchema.index({ orgId: 1, projectId: 1, startDate: -1 });

const Sprint = mongoose.model<ISprintDocument>("Sprint", sprintSchema);
export default Sprint;

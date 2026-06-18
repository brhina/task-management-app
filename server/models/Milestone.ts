import mongoose from "mongoose";

export type MilestoneStatus = "Planned" | "In Progress" | "Completed" | "At Risk";

export interface IMilestone {
  orgId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  targetDate: Date;
  status: MilestoneStatus;
  taskIds?: mongoose.Types.ObjectId[];
}

export interface IMilestoneDocument extends IMilestone, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new mongoose.Schema<IMilestoneDocument>(
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
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    targetDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Planned", "In Progress", "Completed", "At Risk"],
      default: "Planned",
    },
    taskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
  },
  { timestamps: true },
);

milestoneSchema.index({ orgId: 1, projectId: 1, targetDate: 1 });

const Milestone = mongoose.model<IMilestoneDocument>("Milestone", milestoneSchema);
export default Milestone;

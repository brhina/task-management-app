import mongoose from "mongoose";

export type GoalTimeframe =
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "Yearly"
  | "Custom";

export type GoalStatus =
  | "Not Started"
  | "In Progress"
  | "On Track"
  | "At Risk"
  | "Behind"
  | "Completed"
  | "Closed";

export type GoalCategory = "Company" | "Team" | "Individual";
export type GoalPriority = "Low" | "Medium" | "High" | "Critical";

export interface IGoal {
  orgId: mongoose.Types.ObjectId;
  title: string;
  objective?: string;
  metric?: string;
  targetValue?: number;
  currentValue?: number;
  ownerId: mongoose.Types.ObjectId;
  timeframe: GoalTimeframe;
  status: GoalStatus;
  category: GoalCategory;
  priority: GoalPriority;
  startDate?: Date;
  endDate?: Date;
}

export interface IGoalDocument extends IGoal, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new mongoose.Schema<IGoalDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    objective: {
      type: String,
      required: false,
      trim: true,
    },
    metric: {
      type: String,
      required: false,
      trim: true,
    },
    targetValue: {
      type: Number,
      required: false,
      min: 0,
    },
    currentValue: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    timeframe: {
      type: String,
      enum: ["Weekly", "Monthly", "Quarterly", "Yearly", "Custom"],
      default: "Quarterly",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "Not Started",
        "In Progress",
        "On Track",
        "At Risk",
        "Behind",
        "Completed",
        "Closed",
      ],
      default: "On Track",
      index: true,
    },
    category: {
      type: String,
      enum: ["Company", "Team", "Individual"],
      default: "Company",
      index: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    startDate: {
      type: Date,
      required: false,
    },
    endDate: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true },
);

goalSchema.index({ orgId: 1, title: 1 });
goalSchema.index({ orgId: 1, status: 1, ownerId: 1 });
goalSchema.index({ title: "text", objective: "text" });

const Goal = mongoose.model<IGoalDocument>("Goal", goalSchema);

export default Goal;

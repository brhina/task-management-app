import mongoose from "mongoose";

export type KeyResultUnit = "percentage" | "currency" | "number" | "boolean";
export type KeyResultStatus = "Not Started" | "In Progress" | "Completed" | "At Risk";

export interface IKeyResult {
  orgId: mongoose.Types.ObjectId;
  objectiveId: mongoose.Types.ObjectId;
  title: string;
  metric?: string;
  unit?: KeyResultUnit;
  status?: KeyResultStatus;
  startValue?: number;
  targetValue?: number;
  currentValue?: number;
  ownerId?: mongoose.Types.ObjectId;
  linkedProjectIds?: mongoose.Types.ObjectId[];
  linkedTaskIds?: mongoose.Types.ObjectId[];
}

export interface IKeyResultDocument extends IKeyResult, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const keyResultSchema = new mongoose.Schema<IKeyResultDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    objectiveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    metric: { type: String, trim: true },
    unit: {
      type: String,
      enum: ["percentage", "currency", "number", "boolean"],
      default: "percentage",
    },
    status: {
      type: String,
      enum: ["Not Started", "In Progress", "Completed", "At Risk"],
      default: "In Progress",
    },
    startValue: { type: Number, default: 0 },
    targetValue: { type: Number, min: 0 },
    currentValue: { type: Number, min: 0, default: 0 },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    linkedProjectIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    ],
    linkedTaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
  },
  { timestamps: true },
);

keyResultSchema.index({ orgId: 1, objectiveId: 1 });

const KeyResult = mongoose.model<IKeyResultDocument>("KeyResult", keyResultSchema);
export default KeyResult;

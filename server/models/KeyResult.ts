import mongoose from "mongoose";

export interface IKeyResult {
  orgId: mongoose.Types.ObjectId;
  objectiveId: mongoose.Types.ObjectId;
  title: string;
  metric?: string;
  targetValue?: number;
  currentValue?: number;
  linkedProjectIds?: mongoose.Types.ObjectId[];
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
    targetValue: { type: Number, min: 0 },
    currentValue: { type: Number, min: 0, default: 0 },
    linkedProjectIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    ],
  },
  { timestamps: true },
);

keyResultSchema.index({ orgId: 1, objectiveId: 1 });

const KeyResult = mongoose.model<IKeyResultDocument>("KeyResult", keyResultSchema);
export default KeyResult;

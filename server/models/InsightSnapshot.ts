import mongoose from "mongoose";

export type SnapshotScopeType = "Org" | "Project" | "User";

export interface IInsightSnapshot {
  orgId: mongoose.Types.ObjectId;
  scopeType: SnapshotScopeType;
  scopeId: mongoose.Types.ObjectId;
  computedAt: Date;
  payload: any;
}

export interface IInsightSnapshotDocument
  extends IInsightSnapshot, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const insightSnapshotSchema = new mongoose.Schema<IInsightSnapshotDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    scopeType: {
      type: String,
      enum: ["Org", "Project", "User"],
      required: true,
      index: true,
    },
    scopeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    computedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true },
);

insightSnapshotSchema.index({
  orgId: 1,
  scopeType: 1,
  scopeId: 1,
  computedAt: -1,
});

const InsightSnapshot = mongoose.model<IInsightSnapshotDocument>(
  "InsightSnapshot",
  insightSnapshotSchema,
);

export default InsightSnapshot;

import mongoose from "mongoose";

export type AIRecommendationStatus = "pending" | "accepted" | "rejected";

export interface IAIRecommendation {
  orgId: mongoose.Types.ObjectId;
  agentId: string;
  workflowRunId?: mongoose.Types.ObjectId;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  status: AIRecommendationStatus;
  createdBy: mongoose.Types.ObjectId;
}

export interface IAIRecommendationDocument
  extends IAIRecommendation,
    mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const aiRecommendationSchema = new mongoose.Schema<IAIRecommendationDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    agentId: { type: String, required: true, index: true },
    workflowRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AIWorkflowRun",
    },
    input: { type: mongoose.Schema.Types.Mixed, required: true },
    output: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
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

aiRecommendationSchema.index({ orgId: 1, status: 1, createdAt: -1 });

const AIRecommendation = mongoose.model<IAIRecommendationDocument>(
  "AIRecommendation",
  aiRecommendationSchema,
);
export default AIRecommendation;

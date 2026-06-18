import mongoose from "mongoose";

export type AIWorkflowRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "suspended";

export interface IAIWorkflowRun {
  orgId: mongoose.Types.ObjectId;
  workflowId: string;
  mastraRunId?: string;
  status: AIWorkflowRunStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  steps?: Array<{
    stepId: string;
    status: string;
    output?: unknown;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
  }>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  createdBy: mongoose.Types.ObjectId;
}

export interface IAIWorkflowRunDocument
  extends IAIWorkflowRun,
    mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const aiWorkflowRunSchema = new mongoose.Schema<IAIWorkflowRunDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    workflowId: { type: String, required: true, index: true },
    mastraRunId: { type: String, index: true },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "suspended"],
      default: "pending",
      index: true,
    },
    input: { type: mongoose.Schema.Types.Mixed, required: true },
    output: { type: mongoose.Schema.Types.Mixed },
    steps: [
      {
        stepId: String,
        status: String,
        output: mongoose.Schema.Types.Mixed,
        error: String,
        startedAt: Date,
        completedAt: Date,
      },
    ],
    startedAt: { type: Date, required: true, default: () => new Date() },
    completedAt: Date,
    error: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

aiWorkflowRunSchema.index({ orgId: 1, workflowId: 1, createdAt: -1 });

const AIWorkflowRun = mongoose.model<IAIWorkflowRunDocument>(
  "AIWorkflowRun",
  aiWorkflowRunSchema,
);
export default AIWorkflowRun;

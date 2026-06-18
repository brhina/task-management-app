import AIRecommendation from "../../models/AIRecommendation.js";
import AIWorkflowRun, {
  type IAIWorkflowRun,
} from "../../models/AIWorkflowRun.js";
import type { ExecutionContext } from "../config/context.js";

export async function saveRecommendation(
  ctx: ExecutionContext,
  data: {
    agentId: string;
    workflowRunId?: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    status?: "pending" | "accepted" | "rejected";
  },
) {
  return AIRecommendation.create({
    orgId: ctx.orgId,
    agentId: data.agentId,
    workflowRunId: data.workflowRunId,
    input: data.input,
    output: data.output,
    status: data.status || "pending",
    createdBy: ctx.userId,
  });
}

export async function listRecommendations(
  ctx: ExecutionContext,
  status?: string,
) {
  const filter: Record<string, unknown> = { orgId: ctx.orgId };
  if (status) filter.status = status;
  return AIRecommendation.find(filter).sort({ createdAt: -1 }).limit(50);
}

export async function updateRecommendationStatus(
  ctx: ExecutionContext,
  id: string,
  status: "accepted" | "rejected",
) {
  return AIRecommendation.findOneAndUpdate(
    { _id: id, orgId: ctx.orgId },
    { status },
    { new: true },
  );
}

export async function createWorkflowRun(
  ctx: ExecutionContext,
  data: {
    workflowId: string;
    input: Record<string, unknown>;
    mastraRunId?: string;
  },
) {
  return AIWorkflowRun.create({
    orgId: ctx.orgId,
    workflowId: data.workflowId,
    input: data.input,
    mastraRunId: data.mastraRunId,
    status: "running",
    startedAt: new Date(),
    createdBy: ctx.userId,
  });
}

export async function completeWorkflowRun(
  runId: string,
  data: {
    status: "completed" | "failed" | "suspended";
    output?: Record<string, unknown>;
    steps?: Array<{
      stepId: string;
      status: string;
      output?: unknown;
      error?: string;
      startedAt?: Date;
      completedAt?: Date;
    }>;
    error?: string;
  },
) {
  return AIWorkflowRun.findByIdAndUpdate(
    runId,
    {
      status: data.status,
      output: data.output,
      steps: data.steps,
      error: data.error,
      completedAt: new Date(),
    },
    { new: true },
  );
}

export async function getWorkflowRun(ctx: ExecutionContext, runId: string) {
  return AIWorkflowRun.findOne({ _id: runId, orgId: ctx.orgId });
}

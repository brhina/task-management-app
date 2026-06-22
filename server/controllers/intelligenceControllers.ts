import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { getMastra } from "../mastra/index.js";
import { generateProjectPlan } from "../mastra/agents/project-planner.js";
import { generateTaskBreakdown } from "../mastra/agents/task-breakdown.js";
import { analyzeRisks } from "../mastra/agents/risk-analysis.js";
import { generateSprintPlan } from "../mastra/agents/sprint-planning.js";
import { generateStatusReport } from "../mastra/agents/status-report.js";
import { generateOkrs } from "../mastra/agents/okr-assistant.js";
import { runDependencyIntelligence } from "../mastra/agents/dependency-intelligence.js";
import { generateExecutiveIntelligence } from "../mastra/agents/executive-intelligence.js";
import { classifyIntentLocal } from "../mastra/agents/orchestrator.js";
import { assembleContext } from "../mastra/rag/context-assembler.js";
import {
  completeWorkflowRun,
  createWorkflowRun,
  getWorkflowRun,
  listRecommendations,
  saveRecommendation,
  updateRecommendationStatus,
} from "../mastra/services/artifact-store.js";
import { logAudit } from "../mastra/services/audit-log.js";
import { createRequestContext } from "../mastra/types/tool-context.js";
import type { ExecutionContext } from "../mastra/config/context.js";
import { memoryResourceId } from "../mastra/memory/scopes.js";
import {
  enqueueExecutiveReporting,
  enqueueRiskMonitoring,
} from "../infra/queue/queues.js";
import { createProject } from "../mastra/services/projectService.js";

function getCtx(req: AuthRequest): ExecutionContext {
  return {
    orgId: String(req.orgId),
    userId: String(req.user._id),
    role: req.membershipRole || "OrgMember",
  };
}

interface PageContextInput {
  pageType?: string;
  pageTitle?: string;
  entityIds?: {
    taskId?: string;
    projectId?: string;
    goalId?: string;
    userId?: string;
  };
  entitySnapshot?: Record<string, unknown>;
  preferredIntent?: string;
}

function buildPageContextPrefix(pageContext?: PageContextInput): string {
  if (!pageContext) return "";
  const parts: string[] = ["## Page Context"];
  if (pageContext.pageType) parts.push(`Page: ${pageContext.pageType}`);
  if (pageContext.pageTitle) parts.push(`Title: ${pageContext.pageTitle}`);
  if (pageContext.entityIds && Object.keys(pageContext.entityIds).length > 0) {
    parts.push(`Entity IDs: ${JSON.stringify(pageContext.entityIds)}`);
  }
  if (pageContext.entitySnapshot && Object.keys(pageContext.entitySnapshot).length > 0) {
    parts.push(`Entity snapshot: ${JSON.stringify(pageContext.entitySnapshot)}`);
  }
  return parts.length > 1 ? `${parts.join("\n")}\n\n` : "";
}

async function dispatchIntent(
  ctx: ExecutionContext,
  intentName: string,
  message: string,
) {
  switch (intentName) {
    case "plan_project":
      return generateProjectPlan(message, {
        resourceId: memoryResourceId(ctx),
        requestContext: createRequestContext(ctx),
      });
    case "breakdown_task":
      return generateTaskBreakdown(message, {
        resourceId: memoryResourceId(ctx),
        requestContext: createRequestContext(ctx),
      });
    case "analyze_risks":
      return analyzeRisks(message, {
        resourceId: memoryResourceId(ctx),
        requestContext: createRequestContext(ctx),
      });
    case "plan_sprint":
      return generateSprintPlan(message, {
        resourceId: memoryResourceId(ctx),
        requestContext: createRequestContext(ctx),
      });
    case "generate_report":
      return generateStatusReport(message, {
        resourceId: memoryResourceId(ctx),
        requestContext: createRequestContext(ctx),
      });
    case "generate_okrs":
      return generateOkrs(message, {
        resourceId: memoryResourceId(ctx),
        requestContext: createRequestContext(ctx),
      });
    case "analyze_dependencies":
      return runDependencyIntelligence(message, {
        resourceId: memoryResourceId(ctx),
        requestContext: createRequestContext(ctx),
      });
    case "portfolio_intelligence":
      return generateExecutiveIntelligence(message, {
        resourceId: memoryResourceId(ctx),
        requestContext: createRequestContext(ctx),
      });
    default:
      return null;
  }
}

async function runWorkflowHandler(
  req: AuthRequest,
  res: Response,
  workflowId: string,
  input: Record<string, unknown>,
) {
  const ctx = getCtx(req);
  const mastra = getMastra();
  const workflow = mastra.getWorkflow(workflowId as any);
  if (!workflow) {
    res.status(404).json({ message: `Workflow not found: ${workflowId}` });
    return;
  }

  const runRecord = await createWorkflowRun(ctx, { workflowId, input });

  try {
    const run = await workflow.createRun({
      resourceId: memoryResourceId(ctx),
    });

    const result = await run.start({
      inputData: input,
      requestContext: createRequestContext(ctx),
    });

    await completeWorkflowRun(String(runRecord._id), {
      status: "completed",
      output: result as Record<string, unknown>,
    });

    logAudit({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "workflow.completed",
      resource: workflowId,
      resourceId: String(runRecord._id),
    });

    res.status(200).json({
      message: "Workflow completed",
      data: { workflowRunId: runRecord._id, result },
    });
  } catch (error: any) {
    await completeWorkflowRun(String(runRecord._id), {
      status: "failed",
      error: error.message,
    });
    res.status(500).json({ message: error.message });
  }
}

export const planProject = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }
    await runWorkflowHandler(req, res, "projectCreation", {
      ...req.body,
      dryRun: req.body.dryRun ?? true,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const applyProjectPlan = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }
    await runWorkflowHandler(req, res, "projectCreation", {
      ...req.body,
      dryRun: false,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const breakdownTask = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const ctx = getCtx(req);
    const { taskId, taskTitle, taskDescription } = req.body;
    const prompt = taskId
      ? `Break down task ID ${taskId}: ${taskTitle || ""}`
      : `Break down task: ${taskTitle}. ${taskDescription || ""}`;

    const result = await generateTaskBreakdown(prompt, {
      resourceId: memoryResourceId(ctx),
      requestContext: createRequestContext(ctx),
    });

    const rec = await saveRecommendation(ctx, {
      agentId: "task-breakdown",
      input: req.body,
      output: result as Record<string, unknown>,
    });

    res.status(200).json({
      message: "Task breakdown generated",
      data: { result, recommendationId: rec._id },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const analyzeRisksHandler = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const ctx = getCtx(req);
    const { projectId, scope } = req.body;
    const prompt = projectId
      ? `Analyze risks for project ${projectId}`
      : `Analyze ${scope || "org"}-wide project risks`;

    const result = await analyzeRisks(prompt, {
      resourceId: memoryResourceId(ctx),
      requestContext: createRequestContext(ctx),
    });

    const rec = await saveRecommendation(ctx, {
      agentId: "risk-analysis",
      input: req.body,
      output: result as Record<string, unknown>,
    });

    res.status(200).json({
      message: "Risk analysis complete",
      data: { result, recommendationId: rec._id },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const planSprint = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    await runWorkflowHandler(req, res, "sprintPlanning", req.body);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const generateReport = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const ctx = getCtx(req);
    const { reportType = "weekly", projectId } = req.body;
    const prompt = `Generate a ${reportType} report${projectId ? ` for project ${projectId}` : ""}.`;

    const result = await generateStatusReport(prompt, {
      resourceId: memoryResourceId(ctx),
      requestContext: createRequestContext(ctx),
    });

    res.status(200).json({ message: "Report generated", data: result });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const generateOkrsHandler = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const ctx = getCtx(req);
    const { timeframe, focus } = req.body;
    const prompt = `Generate OKRs for timeframe ${timeframe || "Quarterly"}. Focus: ${focus || "execution effectiveness"}.`;

    const result = await generateOkrs(prompt, {
      resourceId: memoryResourceId(ctx),
      requestContext: createRequestContext(ctx),
    });

    const rec = await saveRecommendation(ctx, {
      agentId: "okr-assistant",
      input: req.body,
      output: result as Record<string, unknown>,
    });

    res.status(200).json({
      message: "OKRs generated",
      data: { result, recommendationId: rec._id },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const analyzeDependenciesHandler = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const ctx = getCtx(req);
    const { taskId, question } = req.body;
    const prompt =
      question ||
      (taskId
        ? `What happens if task ${taskId} is delayed?`
        : "Analyze critical path and blocked teams.");

    const result = await runDependencyIntelligence(prompt, {
      resourceId: memoryResourceId(ctx),
      requestContext: createRequestContext(ctx),
    });

    res.status(200).json({ message: "Dependency analysis complete", data: result });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPortfolio = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const ctx = getCtx(req);
    const result = await generateExecutiveIntelligence(
      "Provide portfolio-level executive intelligence for all active projects.",
      { resourceId: memoryResourceId(ctx), requestContext: createRequestContext(ctx) },
    );

    res.status(200).json({ message: "Portfolio intelligence", data: result });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const orchestrate = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const ctx = getCtx(req);
    const { message, pageContext } = req.body as {
      message: string;
      pageContext?: PageContextInput;
    };
    if (!message) {
      res.status(400).json({ message: "message is required" });
      return;
    }

    const enrichedMessage = `${buildPageContextPrefix(pageContext)}${message}`;
    const agentOptions = {
      resourceId: memoryResourceId(ctx),
      requestContext: createRequestContext(ctx),
    };

    const intentName = pageContext?.preferredIntent || classifyIntentLocal(enrichedMessage).intent;
    const result = await dispatchIntent(ctx, intentName, enrichedMessage);

    res.status(200).json({
      message: "Orchestration complete",
      data: { intent: { intent: intentName }, result },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getRecommendations = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const ctx = getCtx(req);
    const status = req.query.status as string | undefined;
    const data = await listRecommendations(ctx, status);
    res.status(200).json({ message: "Recommendations fetched", data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const patchRecommendation = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const ctx = getCtx(req);
    const { status } = req.body;
    if (!["accepted", "rejected"].includes(status)) {
      res.status(400).json({ message: "status must be accepted or rejected" });
      return;
    }

    const rec = await updateRecommendationStatus(
      ctx,
      String(req.params.id),
      status,
    );
    if (!rec) {
      res.status(404).json({ message: "Recommendation not found" });
      return;
    }

    if (status === "accepted" && rec.agentId === "project-creation-workflow") {
      const output = rec.output as any;
      if (output?.plan) {
        const project = await createProject(ctx, {
          name: (rec.input as any).name || "AI Planned Project",
          description: (rec.input as any).description,
          targetDate: (rec.input as any).deadline
            ? new Date((rec.input as any).deadline)
            : undefined,
          dryRun: false,
        });
        logAudit({
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: "recommendation.accepted",
          resource: "project",
          metadata: { recommendationId: rec._id },
        });
        res.status(200).json({
          message: "Recommendation accepted and applied",
          data: { recommendation: rec, project },
        });
        return;
      }
    }

    res.status(200).json({
      message: `Recommendation ${status}`,
      data: rec,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getWorkflowRunHandler = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const ctx = getCtx(req);
    const run = await getWorkflowRun(ctx, String(req.params.id));
    if (!run) {
      res.status(404).json({ message: "Workflow run not found" });
      return;
    }
    res.status(200).json({ message: "Workflow run fetched", data: run });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const queryRag = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const ctx = getCtx(req);
    const { query, projectId, pageContext } = req.body as {
      query: string;
      projectId?: string;
      pageContext?: PageContextInput;
    };
    if (!query) {
      res.status(400).json({ message: "query is required" });
      return;
    }

    const context = await assembleContext({
      orgId: ctx.orgId,
      query,
      projectId: projectId || pageContext?.entityIds?.projectId,
      taskId: pageContext?.entityIds?.taskId,
      goalId: pageContext?.entityIds?.goalId,
      entitySnapshot: pageContext?.entitySnapshot,
    });

    const enrichedMessage = `${buildPageContextPrefix(pageContext)}${context.promptContext}\n\nUser question: ${query}`;
    const agentOptions = {
      resourceId: memoryResourceId(ctx),
      requestContext: createRequestContext(ctx),
    };

    const intentName = pageContext?.preferredIntent || classifyIntentLocal(enrichedMessage).intent;
    let result: unknown;

    if (intentName && intentName !== "general_query") {
      result = await dispatchIntent(ctx, intentName, enrichedMessage);
    } else {
      result = { intent: intentName, summary: "No specialized agent matched." };
    }

    res.status(200).json({
      message: "Query processed",
      data: { context, intent: { intent: intentName }, result },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const scheduleRiskMonitoring = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const ctx = getCtx(req);
    const job = await enqueueRiskMonitoring(ctx);
    res.status(202).json({
      message: "Risk monitoring job enqueued",
      data: { jobId: job.id },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const scheduleExecutiveReporting = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const ctx = getCtx(req);
    const job = await enqueueExecutiveReporting(ctx);
    res.status(202).json({
      message: "Executive reporting job enqueued",
      data: { jobId: job.id },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

import { Worker } from "bullmq";
import { getMastra } from "../../mastra/index.js";
import { createRequestContext } from "../../mastra/types/tool-context.js";
import {
  completeWorkflowRun,
  createWorkflowRun,
} from "../../mastra/services/artifact-store.js";
import { reindexOrg } from "../../services/ragChangeStreams.js";
import { QUEUE_NAMES } from "./queues.js";

async function runWorkflow(
  workflowId: string,
  input: Record<string, unknown>,
  ctx: { orgId: string; userId: string; role: string },
) {
  const mastra = getMastra();
  const workflow = mastra.getWorkflow(workflowId as any);
  if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

  const runRecord = await createWorkflowRun(
    { orgId: ctx.orgId, userId: ctx.userId, role: ctx.role as any },
    { workflowId, input },
  );

  try {
    const run = await workflow.createRun({
      resourceId: `${ctx.orgId}:${ctx.userId}`,
    });

    const requestContext = createRequestContext({
      orgId: ctx.orgId,
      userId: ctx.userId,
      role: ctx.role as any,
    });

    const result = await run.start({
      inputData: input,
      requestContext,
    });

    await completeWorkflowRun(String(runRecord._id), {
      status: "completed",
      output: result as Record<string, unknown>,
    });

    return result;
  } catch (err: any) {
    await completeWorkflowRun(String(runRecord._id), {
      status: "failed",
      error: err.message,
    });
    throw err;
  }
}

export function startWorkers() {
  const connection = {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
  };

  new Worker(
    QUEUE_NAMES.RISK_MONITORING,
    async (job) => {
      await runWorkflow("riskMonitoring", {}, job.data);
    },
    { connection, concurrency: 2 },
  );

  new Worker(
    QUEUE_NAMES.EXECUTIVE_REPORTING,
    async (job) => {
      await runWorkflow("executiveReporting", {}, job.data);
    },
    { connection, concurrency: 2 },
  );

  new Worker(
    QUEUE_NAMES.SPRINT_PLANNING,
    async (job) => {
      await runWorkflow("sprintPlanning", job.data, {
        orgId: job.data.orgId,
        userId: job.data.userId,
        role: job.data.role,
      });
    },
    { connection, concurrency: 2 },
  );

  new Worker(
    QUEUE_NAMES.RAG_INDEXING,
    async (job) => {
      await reindexOrg(job.data.orgId);
    },
    { connection, concurrency: 1 },
  );

  console.log("BullMQ intelligence workers started");
}

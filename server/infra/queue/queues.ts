import { Queue } from "bullmq";

export const QUEUE_NAMES = {
  RISK_MONITORING: "intelligence-risk-monitoring",
  EXECUTIVE_REPORTING: "intelligence-executive-reporting",
  SPRINT_PLANNING: "intelligence-sprint-planning",
  RAG_INDEXING: "intelligence-rag-indexing",
} as const;

const queues = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    queues.set(
      name,
      new Queue(name, {
        connection: {
          host: process.env.REDIS_HOST || "localhost",
          port: Number(process.env.REDIS_PORT || 6379),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }),
    );
  }
  return queues.get(name)!;
}

export async function enqueueRiskMonitoring(data: {
  orgId: string;
  userId: string;
  role: string;
}) {
  const queue = getQueue(QUEUE_NAMES.RISK_MONITORING);
  return queue.add("risk-monitoring", data, {
    jobId: `risk:${data.orgId}:${new Date().toISOString().slice(0, 13)}`,
  });
}

export async function enqueueExecutiveReporting(data: {
  orgId: string;
  userId: string;
  role: string;
}) {
  const queue = getQueue(QUEUE_NAMES.EXECUTIVE_REPORTING);
  return queue.add("executive-reporting", data, {
    jobId: `exec:${data.orgId}:${new Date().toISOString().slice(0, 10)}`,
  });
}

export async function enqueueSprintPlanning(data: Record<string, unknown>) {
  const queue = getQueue(QUEUE_NAMES.SPRINT_PLANNING);
  return queue.add("sprint-planning", data);
}

export async function enqueueRagIndexing(data: { orgId: string }) {
  const queue = getQueue(QUEUE_NAMES.RAG_INDEXING);
  return queue.add("rag-indexing", data);
}

import Task from "../../models/Task.js";
import Goal from "../../models/Goal.js";
import { hybridRetrieve } from "./retriever.js";

export async function assembleContext(params: {
  orgId: string;
  query: string;
  projectId?: string;
  taskId?: string;
  goalId?: string;
  entitySnapshot?: Record<string, unknown>;
  maxTokens?: number;
}) {
  const chunks = await hybridRetrieve({
    orgId: params.orgId,
    query: params.query,
    projectId: params.projectId,
    topK: 8,
  });

  const taskFilter: Record<string, unknown> = {
    orgId: params.orgId,
    updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  };
  if (params.projectId) taskFilter.projectId = params.projectId;
  if (params.taskId) taskFilter._id = params.taskId;

  const recentTasks = await Task.find(taskFilter)
    .select("title status dueDate blockersText")
    .limit(10);

  let entitySection = "";
  if (params.entitySnapshot && Object.keys(params.entitySnapshot).length > 0) {
    entitySection = `\n\n## Current Page Entity\n${JSON.stringify(params.entitySnapshot, null, 2)}`;
  }

  if (params.taskId && !params.entitySnapshot) {
    const task = await Task.findOne({ _id: params.taskId, orgId: params.orgId })
      .select("title status description dueDate priority projectId")
      .lean();
    if (task) {
      entitySection = `\n\n## Focus Task\n${JSON.stringify(task, null, 2)}`;
    }
  }

  if (params.goalId && !params.entitySnapshot) {
    const goal = await Goal.findOne({ _id: params.goalId, orgId: params.orgId })
      .select("title objective metric timeframe targetValue keyResults")
      .lean();
    if (goal) {
      entitySection = `\n\n## Focus Goal\n${JSON.stringify(goal, null, 2)}`;
    }
  }

  const ragSection = chunks
    .map(
      (c, i) =>
        `[${i + 1}] (${c.sourceType}) ${c.content.slice(0, 600)}`,
    )
    .join("\n\n");

  const liveSection = recentTasks
    .map(
      (t) =>
        `- ${t.title} [${t.status}] due ${t.dueDate?.toISOString?.() || "n/a"}`,
    )
    .join("\n");

  return {
    promptContext: `## Retrieved Knowledge\n${ragSection}\n\n## Recently Updated Tasks (24h)\n${liveSection}${entitySection}`,
    chunkCount: chunks.length,
    recentTaskCount: recentTasks.length,
  };
}

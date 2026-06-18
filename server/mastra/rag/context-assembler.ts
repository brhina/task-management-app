import Task from "../../models/Task.js";
import { hybridRetrieve } from "./retriever.js";

export async function assembleContext(params: {
  orgId: string;
  query: string;
  projectId?: string;
  maxTokens?: number;
}) {
  const chunks = await hybridRetrieve({
    orgId: params.orgId,
    query: params.query,
    projectId: params.projectId,
    topK: 8,
  });

  const recentTasks = await Task.find({
    orgId: params.orgId,
    updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    ...(params.projectId ? { projectId: params.projectId } : {}),
  })
    .select("title status dueDate blockersText")
    .limit(10);

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
    promptContext: `## Retrieved Knowledge\n${ragSection}\n\n## Recently Updated Tasks (24h)\n${liveSection}`,
    chunkCount: chunks.length,
    recentTaskCount: recentTasks.length,
  };
}

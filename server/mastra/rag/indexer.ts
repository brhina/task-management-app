import mongoose from "mongoose";
import KnowledgeChunk, {
  type KnowledgeSourceType,
} from "../../models/KnowledgeChunk.js";
import { buildChunkHeader, chunkText } from "./chunker.js";
import { embedTexts } from "./embedder.js";

export async function indexDocument(params: {
  orgId: string;
  sourceType: KnowledgeSourceType;
  sourceId: string;
  content: string;
  metadata?: Record<string, unknown>;
}) {
  await KnowledgeChunk.deleteMany({
    orgId: params.orgId,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
  });

  const header = buildChunkHeader({
    sourceType: params.sourceType,
    title: params.metadata?.title as string | undefined,
    status: params.metadata?.status as string | undefined,
  });

  const chunks = chunkText(`${header}\n${params.content}`);
  const embeddings = await embedTexts(chunks);

  const docs = chunks.map((content, i) => ({
    orgId: new mongoose.Types.ObjectId(params.orgId),
    sourceType: params.sourceType,
    sourceId: new mongoose.Types.ObjectId(params.sourceId),
    content,
    embedding: embeddings[i],
    metadata: params.metadata,
    indexedAt: new Date(),
  }));

  if (docs.length > 0) {
    await KnowledgeChunk.insertMany(docs);
  }

  return { indexed: docs.length };
}

export async function indexProject(orgId: string, project: {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  status?: string;
}) {
  return indexDocument({
    orgId,
    sourceType: "project",
    sourceId: String(project._id),
    content: `${project.name}\n${project.description || ""}`,
    metadata: { title: project.name, status: project.status },
  });
}

export async function indexTask(orgId: string, task: {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status?: string;
  blockersText?: string[];
}) {
  const blockers = (task.blockersText || []).join("\n");
  return indexDocument({
    orgId,
    sourceType: "task",
    sourceId: String(task._id),
    content: `${task.title}\n${task.description || ""}\nBlockers: ${blockers}`,
    metadata: { title: task.title, status: task.status },
  });
}

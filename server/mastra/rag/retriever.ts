import mongoose from "mongoose";
import KnowledgeChunk from "../../models/KnowledgeChunk.js";
import { embedText } from "./embedder.js";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

export async function retrieveChunks(params: {
  orgId: string;
  query: string;
  projectId?: string;
  topK?: number;
}) {
  const queryEmbedding = await embedText(params.query);
  const topK = params.topK ?? 8;

  const filter: Record<string, unknown> = {
    orgId: new mongoose.Types.ObjectId(params.orgId),
  };
  if (params.projectId) {
    filter["metadata.projectId"] = params.projectId;
  }

  const candidates = await KnowledgeChunk.find(filter).limit(200);

  const scored = candidates
    .filter((c) => c.embedding && c.embedding.length > 0)
    .map((c) => ({
      chunk: c,
      score: cosineSimilarity(queryEmbedding, c.embedding!),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map((s) => ({
    content: s.chunk.content,
    sourceType: s.chunk.sourceType,
    sourceId: String(s.chunk.sourceId),
    score: s.score,
    metadata: s.chunk.metadata,
  }));
}

export async function hybridRetrieve(params: {
  orgId: string;
  query: string;
  projectId?: string;
  topK?: number;
}) {
  const [vectorResults, textResults] = await Promise.all([
    retrieveChunks(params),
    KnowledgeChunk.find({
      orgId: params.orgId,
      $text: { $search: params.query },
    })
      .limit(5)
      .then((docs) =>
        docs.map((d) => ({
          content: d.content,
          sourceType: d.sourceType,
          sourceId: String(d.sourceId),
          score: 0.5,
          metadata: d.metadata,
        })),
      ),
  ]);

  const seen = new Set<string>();
  const merged = [...vectorResults, ...textResults].filter((r) => {
    const key = `${r.sourceType}:${r.sourceId}:${r.content.slice(0, 50)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return merged.slice(0, params.topK ?? 8);
}

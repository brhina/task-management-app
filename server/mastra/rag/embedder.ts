import { embedMany } from "ai";
import { EMBEDDING_MODEL } from "../config/models.js";
import { openrouter } from "../config/providers.js";

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const { embeddings } = await embedMany({
    model: openrouter.embedding(EMBEDDING_MODEL),
    values: texts,
  });

  return embeddings;
}

export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding;
}

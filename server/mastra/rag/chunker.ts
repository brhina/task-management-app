const CHUNK_SIZE = 512;
const OVERLAP = 64;

export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = OVERLAP): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim()) chunks.push(chunk);
    i += chunkSize - overlap;
  }

  return chunks.length > 0 ? chunks : [text];
}

export function buildChunkHeader(metadata: {
  sourceType: string;
  title?: string;
  status?: string;
}): string {
  const parts = [`[${metadata.sourceType}]`];
  if (metadata.title) parts.push(metadata.title);
  if (metadata.status) parts.push(`status:${metadata.status}`);
  return parts.join(" ");
}

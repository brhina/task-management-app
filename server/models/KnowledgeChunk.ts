import mongoose from "mongoose";

export type KnowledgeSourceType =
  | "project"
  | "task"
  | "comment"
  | "document"
  | "meeting_note"
  | "decision"
  | "risk"
  | "retrospective";

export interface IKnowledgeChunk {
  orgId: mongoose.Types.ObjectId;
  sourceType: KnowledgeSourceType;
  sourceId: mongoose.Types.ObjectId;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  indexedAt: Date;
}

export interface IKnowledgeChunkDocument
  extends IKnowledgeChunk,
    mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const knowledgeChunkSchema = new mongoose.Schema<IKnowledgeChunkDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: [
        "project",
        "task",
        "comment",
        "document",
        "meeting_note",
        "decision",
        "risk",
        "retrospective",
      ],
      required: true,
      index: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    content: { type: String, required: true },
    embedding: [{ type: Number }],
    metadata: { type: mongoose.Schema.Types.Mixed },
    indexedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true },
);

knowledgeChunkSchema.index({ orgId: 1, sourceType: 1, sourceId: 1 });
knowledgeChunkSchema.index({ content: "text" });

const KnowledgeChunk = mongoose.model<IKnowledgeChunkDocument>(
  "KnowledgeChunk",
  knowledgeChunkSchema,
);
export default KnowledgeChunk;

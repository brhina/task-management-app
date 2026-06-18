import type { KnowledgeSourceType } from "../../models/KnowledgeChunk.js";

export interface KnowledgeSourceConfig {
  type: KnowledgeSourceType;
  indexOnCreate: boolean;
  indexOnUpdate: boolean;
}

export const KNOWLEDGE_SOURCES: KnowledgeSourceConfig[] = [
  { type: "project", indexOnCreate: true, indexOnUpdate: true },
  { type: "task", indexOnCreate: true, indexOnUpdate: true },
  { type: "comment", indexOnCreate: true, indexOnUpdate: false },
  { type: "document", indexOnCreate: true, indexOnUpdate: false },
  { type: "meeting_note", indexOnCreate: true, indexOnUpdate: false },
  { type: "decision", indexOnCreate: true, indexOnUpdate: false },
  { type: "risk", indexOnCreate: true, indexOnUpdate: true },
  { type: "retrospective", indexOnCreate: true, indexOnUpdate: false },
];

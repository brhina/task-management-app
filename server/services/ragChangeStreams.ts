import mongoose from "mongoose";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import { indexProject, indexTask } from "../mastra/rag/indexer.js";

let changeStreamsStarted = false;

export function startRagChangeStreams() {
  if (changeStreamsStarted || process.env.DISABLE_RAG_STREAMS === "true") {
    return;
  }
  changeStreamsStarted = true;

  try {
    Task.watch([], { fullDocument: "updateLookup" }).on(
      "change",
      async (change) => {
        if (
          change.operationType !== "insert" &&
          change.operationType !== "update"
        ) {
          return;
        }
        const doc = change.fullDocument as any;
        if (!doc?.orgId) return;
        await indexTask(String(doc.orgId), doc).catch(console.error);
      },
    );

    Project.watch([], { fullDocument: "updateLookup" }).on(
      "change",
      async (change) => {
        if (
          change.operationType !== "insert" &&
          change.operationType !== "update"
        ) {
          return;
        }
        const doc = change.fullDocument as any;
        if (!doc?.orgId) return;
        await indexProject(String(doc.orgId), doc).catch(console.error);
      },
    );

    console.log("RAG change streams started for Task and Project");
  } catch (err) {
    console.warn(
      "RAG change streams unavailable (requires MongoDB replica set):",
      (err as Error).message,
    );
  }
}

export async function reindexOrg(orgId: string) {
  const orgObjectId = new mongoose.Types.ObjectId(orgId);
  const [projects, tasks] = await Promise.all([
    Project.find({ orgId: orgObjectId }),
    Task.find({ orgId: orgObjectId }),
  ]);

  let indexed = 0;
  for (const p of projects) {
    await indexProject(orgId, p);
    indexed++;
  }
  for (const t of tasks) {
    await indexTask(orgId, t);
    indexed++;
  }
  return { indexed };
}

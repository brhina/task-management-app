import mongoose from "mongoose";
import TaskActivity from "../models/TaskActivity.js";

export async function logTaskActivity(params: {
  orgId: string | mongoose.Types.ObjectId;
  taskId: string | mongoose.Types.ObjectId;
  actorId: string | mongoose.Types.ObjectId;
  action: string;
  field?: string;
  from?: unknown;
  to?: unknown;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await TaskActivity.create({
      orgId: params.orgId,
      taskId: params.taskId,
      actorId: params.actorId,
      action: params.action,
      field: params.field,
      from:
        params.from === undefined || params.from === null
          ? undefined
          : String(params.from),
      to:
        params.to === undefined || params.to === null
          ? undefined
          : String(params.to),
      meta: params.meta,
    });
  } catch (err) {
    console.error("Failed to log task activity:", err);
  }
}

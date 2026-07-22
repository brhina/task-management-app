import Task from "../models/Task.js";

export async function rollupParentProgress(
  parentTaskId: string | undefined | null,
): Promise<void> {
  if (!parentTaskId) return;

  const children = await Task.find({ parentTaskId }).select("progress status");
  if (children.length === 0) return;

  const avg = Math.round(
    children.reduce((sum, c) => sum + (c.progress || 0), 0) / children.length,
  );

  const allCompleted = children.every((c) => c.status === "Completed");
  const anyStarted = children.some(
    (c) => c.status !== "Pending" || (c.progress || 0) > 0,
  );

  let status: "Pending" | "In Progress" | "In Review" | "Completed" = "Pending";
  if (allCompleted) status = "Completed";
  else if (anyStarted) status = "In Progress";

  await Task.findByIdAndUpdate(parentTaskId, { progress: avg, status });
}

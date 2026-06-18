import { enqueueSprintPlanning } from "../queues.js";

export async function scheduleSprintPlanningJob(
  data: Record<string, unknown>,
) {
  return enqueueSprintPlanning(data);
}

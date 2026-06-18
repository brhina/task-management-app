import { enqueueRiskMonitoring } from "../queues.js";

export async function scheduleRiskMonitoringJob(data: {
  orgId: string;
  userId: string;
  role: string;
}) {
  return enqueueRiskMonitoring(data);
}

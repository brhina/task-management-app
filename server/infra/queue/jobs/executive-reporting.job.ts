import { enqueueExecutiveReporting } from "../queues.js";

export async function scheduleExecutiveReportingJob(data: {
  orgId: string;
  userId: string;
  role: string;
}) {
  return enqueueExecutiveReporting(data);
}

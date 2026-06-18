import { Agent } from "@mastra/core/agent";
import { DEFAULT_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { statusReportSchema } from "../schemas/status-report.schema.js";
import { projectTools } from "../tools/project-tools.js";
import { reportingTools } from "../tools/reporting-tools.js";
import { taskTools } from "../tools/task-tools.js";

export const statusReportAgent = new Agent({
  id: "status-report",
  name: "Status Report",
  instructions: `You generate executive and team status reports from live project data.
Report types: daily (tactical), weekly (progress), executive (strategic), health (metrics).
Always use generateReport and getProjectHealth tools first.
Be concise, highlight blockers and risks, include actionable recommendations.`,
  model: DEFAULT_MODEL,
  tools: {
    ...reportingTools,
    getTasks: taskTools.getTasks,
    getProjects: projectTools.getProjects,
  },
  memory: createAgentMemory(),
});

export async function generateStatusReport(
  prompt: string,
  options?: { resourceId?: string; threadId?: string },
) {
  const result = await statusReportAgent.generate(prompt, {
    structuredOutput: { schema: statusReportSchema },
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
  });
  return result.object ?? result.text;
}

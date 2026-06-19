import { Agent } from "@mastra/core/agent";
import { DEFAULT_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { statusReportSchema } from "../schemas/status-report.schema.js";
import { projectTools } from "../tools/project-tools.js";
import { reportingTools } from "../tools/reporting-tools.js";
import { taskTools } from "../tools/task-tools.js";
import { buildJsonInstructions, parseJsonResponse } from "../utils/json-response.js";

export const statusReportAgent = new Agent({
  id: "status-report",
  name: "Status Report",
  instructions: `You generate executive and team status reports from live project data.
Always call generateReport and getProjectHealth tools first.
If a tool returns an error, proceed with the information you have — do NOT ask for context or refuse.
Report types: daily (tactical), weekly (progress), executive (strategic), health (metrics).
Be concise, highlight blockers and risks, include actionable recommendations.
Output ONLY valid JSON matching the schema below. No text outside the JSON.
${buildJsonInstructions(statusReportSchema)}`,
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
  options?: { resourceId?: string; threadId?: string; requestContext?: any },
) {
  const result = await statusReportAgent.generate(prompt, {
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
    requestContext: options?.requestContext,
  });
  try {
    return parseJsonResponse(result.text, statusReportSchema);
  } catch (e) {
    throw new Error(`Failed to parse status report: ${e instanceof Error ? e.message : e}`);
  }
}

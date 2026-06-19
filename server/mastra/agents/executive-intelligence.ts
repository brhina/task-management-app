import { Agent } from "@mastra/core/agent";
import { EXECUTIVE_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { executiveIntelligenceSchema } from "../schemas/executive-intelligence.schema.js";
import { capacityTools } from "../tools/capacity-tools.js";
import { projectTools } from "../tools/project-tools.js";
import { reportingTools } from "../tools/reporting-tools.js";
import { buildJsonInstructions, parseJsonResponse } from "../utils/json-response.js";

export const executiveIntelligenceAgent = new Agent({
  id: "executive-intelligence",
  name: "Executive Intelligence",
  instructions: `You provide portfolio-level intelligence for executives.
Always call getProjects, getProjectHealth, and calculateUtilization tools first.
If a tool returns an error, proceed with the information you have — do NOT ask for context or refuse.
Analyze all projects, capacity bottlenecks, strategic risks, and delivery forecasts.
Provide resource recommendations and portfolio health assessment.
Output ONLY valid JSON matching the schema below. No text outside the JSON.
${buildJsonInstructions(executiveIntelligenceSchema)}`,
  model: EXECUTIVE_MODEL,
  tools: {
    ...projectTools,
    ...reportingTools,
    ...capacityTools,
  },
  memory: createAgentMemory(),
});

export async function generateExecutiveIntelligence(
  prompt: string,
  options?: { resourceId?: string; threadId?: string; requestContext?: any },
) {
  const result = await executiveIntelligenceAgent.generate(prompt, {
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
    requestContext: options?.requestContext,
  });
  try {
    return parseJsonResponse(result.text, executiveIntelligenceSchema);
  } catch (e) {
    throw new Error(`Failed to parse executive intelligence: ${e instanceof Error ? e.message : e}`);
  }
}

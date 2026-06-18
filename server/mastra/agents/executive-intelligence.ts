import { Agent } from "@mastra/core/agent";
import { EXECUTIVE_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { executiveIntelligenceSchema } from "../schemas/executive-intelligence.schema.js";
import { capacityTools } from "../tools/capacity-tools.js";
import { projectTools } from "../tools/project-tools.js";
import { reportingTools } from "../tools/reporting-tools.js";

export const executiveIntelligenceAgent = new Agent({
  id: "executive-intelligence",
  name: "Executive Intelligence",
  instructions: `You provide portfolio-level intelligence for executives.
Analyze all projects, capacity bottlenecks, strategic risks, and delivery forecasts.
Always use getProjects, getProjectHealth, and calculateUtilization tools.
Provide resource recommendations and portfolio health assessment.`,
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
  options?: { resourceId?: string; threadId?: string },
) {
  const result = await executiveIntelligenceAgent.generate(prompt, {
    structuredOutput: { schema: executiveIntelligenceSchema },
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
  });
  return result.object ?? result.text;
}

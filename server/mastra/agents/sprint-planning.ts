import { Agent } from "@mastra/core/agent";
import { DEFAULT_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { sprintPlanSchema } from "../schemas/sprint-plan.schema.js";
import { capacityTools } from "../tools/capacity-tools.js";
import { dependencyTools } from "../tools/dependency-tools.js";
import { taskTools } from "../tools/task-tools.js";
import { buildJsonInstructions, parseJsonResponse } from "../utils/json-response.js";

export const sprintPlanningAgent = new Agent({
  id: "sprint-planning",
  name: "Sprint Planning",
  instructions: `You generate sprint plans based on team capacity, backlog, and dependencies.
Always call the getTasks, getCapacity, and analyzeCriticalPath tools first to get real data.
If a tool returns an error, proceed with the information you have — do NOT ask for context or refuse.
Respect dependency constraints — never schedule blocked tasks.
Provide utilization percentages and forecast completion dates.
Output ONLY valid JSON matching the schema below. No text outside the JSON.
${buildJsonInstructions(sprintPlanSchema)}`,
  model: DEFAULT_MODEL,
  tools: {
    ...taskTools,
    ...capacityTools,
    analyzeCriticalPath: dependencyTools.analyzeCriticalPath,
    detectCycles: dependencyTools.detectCycles,
  },
  memory: createAgentMemory(),
});

export async function generateSprintPlan(
  prompt: string,
  options?: { resourceId?: string; threadId?: string; requestContext?: any },
) {
  const result = await sprintPlanningAgent.generate(prompt, {
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
    requestContext: options?.requestContext,
  });
  try {
    return parseJsonResponse(result.text, sprintPlanSchema);
  } catch (e) {
    throw new Error(`Failed to parse sprint plan: ${e instanceof Error ? e.message : e}`);
  }
}

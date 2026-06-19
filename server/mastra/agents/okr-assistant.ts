import { Agent } from "@mastra/core/agent";
import { DEFAULT_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { okrPlanSchema } from "../schemas/okr-plan.schema.js";
import { projectTools } from "../tools/project-tools.js";
import { taskTools } from "../tools/task-tools.js";
import { buildJsonInstructions, parseJsonResponse } from "../utils/json-response.js";

export const okrAssistantAgent = new Agent({
  id: "okr-assistant",
  name: "OKR Assistant",
  instructions: `You generate and align OKRs (Objectives and Key Results) with organizational goals.
Always call getProjects and getTasks tools first to understand current portfolio.
If a tool returns an error, proceed with the information you have — do NOT ask for context or refuse.
Produce measurable key results with target values.
Score alignment with existing projects and suggest new projects to close gaps.
Output ONLY valid JSON matching the schema below. No text outside the JSON.
${buildJsonInstructions(okrPlanSchema)}`,
  model: DEFAULT_MODEL,
  tools: {
    getProjects: projectTools.getProjects,
    getTasks: taskTools.getTasks,
  },
  memory: createAgentMemory(),
});

export async function generateOkrs(
  prompt: string,
  options?: { resourceId?: string; threadId?: string; requestContext?: any },
) {
  const result = await okrAssistantAgent.generate(prompt, {
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
    requestContext: options?.requestContext,
  });
  try {
    return parseJsonResponse(result.text, okrPlanSchema);
  } catch (e) {
    throw new Error(`Failed to parse OKR plan: ${e instanceof Error ? e.message : e}`);
  }
}

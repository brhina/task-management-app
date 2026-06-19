import { Agent } from "@mastra/core/agent";
import { DEFAULT_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { dependencyIntelligenceSchema } from "../schemas/dependency-intelligence.schema.js";
import { dependencyTools } from "../tools/dependency-tools.js";
import { taskTools } from "../tools/task-tools.js";
import { buildJsonInstructions, parseJsonResponse } from "../utils/json-response.js";

export const dependencyIntelligenceAgent = new Agent({
  id: "dependency-intelligence",
  name: "Dependency Intelligence",
  instructions: `You analyze dependency impact across the task graph.
Always call analyzeCriticalPath and getDependencies tools first.
If a tool returns an error, proceed with the information you have — do NOT ask for context or refuse.
Answer questions like: What happens if this task is delayed? Which tasks are on the critical path? Which teams are blocked?
Provide delay forecasts and recommended actions.
Output ONLY valid JSON matching the schema below. No text outside the JSON.
${buildJsonInstructions(dependencyIntelligenceSchema)}`,
  model: DEFAULT_MODEL,
  tools: {
    ...dependencyTools,
    getTask: taskTools.getTask,
    getTasks: taskTools.getTasks,
  },
  memory: createAgentMemory(),
});

export async function runDependencyIntelligence(
  prompt: string,
  options?: { resourceId?: string; threadId?: string; requestContext?: any },
) {
  const result = await dependencyIntelligenceAgent.generate(prompt, {
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
    requestContext: options?.requestContext,
  });
  try {
    return parseJsonResponse(result.text, dependencyIntelligenceSchema);
  } catch (e) {
    throw new Error(`Failed to parse dependency intelligence: ${e instanceof Error ? e.message : e}`);
  }
}

import { Agent } from "@mastra/core/agent";
import { DEFAULT_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { dependencyIntelligenceSchema } from "../schemas/dependency-intelligence.schema.js";
import { dependencyTools } from "../tools/dependency-tools.js";
import { taskTools } from "../tools/task-tools.js";

export const dependencyIntelligenceAgent = new Agent({
  id: "dependency-intelligence",
  name: "Dependency Intelligence",
  instructions: `You analyze dependency impact across the task graph.
Answer questions like: What happens if this task is delayed? Which tasks are on the critical path? Which teams are blocked?
Always call analyzeCriticalPath and getDependencies tools first.
Provide delay forecasts and recommended actions.`,
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
  options?: { resourceId?: string; threadId?: string },
) {
  const result = await dependencyIntelligenceAgent.generate(prompt, {
    structuredOutput: { schema: dependencyIntelligenceSchema },
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
  });
  return result.object ?? result.text;
}

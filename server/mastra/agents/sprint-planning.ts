import { Agent } from "@mastra/core/agent";
import { DEFAULT_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { sprintPlanSchema } from "../schemas/sprint-plan.schema.js";
import { capacityTools } from "../tools/capacity-tools.js";
import { dependencyTools } from "../tools/dependency-tools.js";
import { taskTools } from "../tools/task-tools.js";

export const sprintPlanningAgent = new Agent({
  id: "sprint-planning",
  name: "Sprint Planning",
  instructions: `You generate sprint plans based on team capacity, backlog, and dependencies.
Always check capacity and workload before assigning tasks.
Respect dependency constraints — never schedule blocked tasks.
Provide utilization percentages and forecast completion dates.`,
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
  options?: { resourceId?: string; threadId?: string },
) {
  const result = await sprintPlanningAgent.generate(prompt, {
    structuredOutput: { schema: sprintPlanSchema },
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
  });
  return result.object ?? result.text;
}

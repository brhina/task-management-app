import { Agent } from "@mastra/core/agent";
import { DEFAULT_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { projectPlanSchema } from "../schemas/project-plan.schema.js";
import { capacityTools } from "../tools/capacity-tools.js";
import { projectTools } from "../tools/project-tools.js";
import { taskTools } from "../tools/task-tools.js";

export const projectPlannerAgent = new Agent({
  id: "project-planner",
  name: "Project Planner",
  instructions: `You are an expert project planning agent for an execution intelligence platform.
Generate complete, actionable project plans from natural language descriptions.
Always produce milestones, tasks with effort estimates, dependencies, and risks.
Use tools to understand existing org context when relevant.
Focus on deliverable outcomes, not generic advice.
Output structured plans suitable for immediate team execution.`,
  model: DEFAULT_MODEL,
  tools: {
    ...projectTools,
    getTasks: taskTools.getTasks,
    getCapacity: capacityTools.getCapacity,
  },
  memory: createAgentMemory(),
});

export async function generateProjectPlan(
  prompt: string,
  options?: { resourceId?: string; threadId?: string },
) {
  const result = await projectPlannerAgent.generate(prompt, {
    structuredOutput: { schema: projectPlanSchema },
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
  });
  return result.object ?? result.text;
}

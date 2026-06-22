import { Agent } from "@mastra/core/agent";
import { DEFAULT_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { projectPlanSchema } from "../schemas/project-plan.schema.js";
import { capacityTools } from "../tools/capacity-tools.js";
import { projectTools } from "../tools/project-tools.js";
import { taskTools } from "../tools/task-tools.js";
import { buildJsonInstructions, parseAgentJsonResult } from "../utils/json-response.js";

export const projectPlannerAgent = new Agent({
  id: "project-planner",
  name: "Project Planner",
  instructions: `You are an expert project planning agent for an execution intelligence platform.
Generate complete, actionable project plans from natural language descriptions.
Always call getProjects, getTasks, and getCapacity tools first to get real data.
If a tool returns an error, proceed with the information you have — do NOT ask for context or refuse.
After tool calls complete, your FINAL response must be ONLY the JSON plan object.
Never respond with conversational text like "I'll help" or "Here is the plan".
Always produce milestones, tasks with effort estimates, dependencies, and risks.
Focus on deliverable outcomes, not generic advice.
Output ONLY valid JSON matching the schema below. No text outside the JSON.
${buildJsonInstructions(projectPlanSchema)}`,
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
  options?: { resourceId?: string; threadId?: string; requestContext?: any },
) {
  const result = await projectPlannerAgent.generate(prompt, {
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
    requestContext: options?.requestContext,
    maxSteps: 8,
  });
  return parseAgentJsonResult(result, projectPlanSchema, "project plan", prompt);
}

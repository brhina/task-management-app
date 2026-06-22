import { Agent } from "@mastra/core/agent";
import { DEFAULT_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { taskBreakdownSchema } from "../schemas/task-breakdown.schema.js";
import { taskTools } from "../tools/task-tools.js";
import { buildJsonInstructions, parseAgentJsonResult } from "../utils/json-response.js";

export const taskBreakdownAgent = new Agent({
  id: "task-breakdown",
  name: "Task Breakdown",
  instructions: `You break large tasks into actionable subtasks with acceptance criteria.
Always call getTask and getTasks tools first to get real data.
If a tool returns an error, proceed with the information you have — do NOT ask for context or refuse.
Each subtask must have a complexity score (1-10) and estimated hours.
Be specific and implementation-oriented.
Output ONLY valid JSON matching the schema below. No text outside the JSON.
${buildJsonInstructions(taskBreakdownSchema)}`,
  model: DEFAULT_MODEL,
  tools: {
    getTask: taskTools.getTask,
    getTasks: taskTools.getTasks,
  },
  memory: createAgentMemory(),
});

export async function generateTaskBreakdown(
  prompt: string,
  options?: { resourceId?: string; threadId?: string; requestContext?: any },
) {
  const result = await taskBreakdownAgent.generate(prompt, {
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
    requestContext: options?.requestContext,
  });
  return parseAgentJsonResult(result, taskBreakdownSchema, "task breakdown", prompt);
}

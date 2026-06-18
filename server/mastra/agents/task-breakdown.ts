import { Agent } from "@mastra/core/agent";
import { DEFAULT_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { taskBreakdownSchema } from "../schemas/task-breakdown.schema.js";
import { taskTools } from "../tools/task-tools.js";

export const taskBreakdownAgent = new Agent({
  id: "task-breakdown",
  name: "Task Breakdown",
  instructions: `You break large tasks into actionable subtasks with acceptance criteria.
Each subtask must have a complexity score (1-10) and estimated hours.
Use getTask when a taskId is provided to understand context.
Be specific and implementation-oriented.`,
  model: DEFAULT_MODEL,
  tools: {
    getTask: taskTools.getTask,
    getTasks: taskTools.getTasks,
  },
  memory: createAgentMemory(),
});

export async function generateTaskBreakdown(
  prompt: string,
  options?: { resourceId?: string; threadId?: string },
) {
  const result = await taskBreakdownAgent.generate(prompt, {
    structuredOutput: { schema: taskBreakdownSchema },
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
  });
  return result.object ?? result.text;
}

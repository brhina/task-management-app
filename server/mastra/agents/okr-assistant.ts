import { Agent } from "@mastra/core/agent";
import { DEFAULT_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { okrPlanSchema } from "../schemas/okr-plan.schema.js";
import { projectTools } from "../tools/project-tools.js";
import { taskTools } from "../tools/task-tools.js";

export const okrAssistantAgent = new Agent({
  id: "okr-assistant",
  name: "OKR Assistant",
  instructions: `You generate and align OKRs (Objectives and Key Results) with organizational goals.
Produce measurable key results with target values.
Score alignment with existing projects and suggest new projects to close gaps.
Use tools to understand current project portfolio.`,
  model: DEFAULT_MODEL,
  tools: {
    getProjects: projectTools.getProjects,
    getTasks: taskTools.getTasks,
  },
  memory: createAgentMemory(),
});

export async function generateOkrs(
  prompt: string,
  options?: { resourceId?: string; threadId?: string },
) {
  const result = await okrAssistantAgent.generate(prompt, {
    structuredOutput: { schema: okrPlanSchema },
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
  });
  return result.object ?? result.text;
}

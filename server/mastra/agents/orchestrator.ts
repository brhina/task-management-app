import { Agent } from "@mastra/core/agent";
import { DEFAULT_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { orchestratorIntentSchema } from "../schemas/orchestrator.schema.js";

export const orchestratorAgent = new Agent({
  id: "orchestrator",
  name: "Execution Intelligence Orchestrator",
  instructions: `You are the supervisor agent for an execution intelligence platform.
Classify user intent and route to the appropriate specialized agent or workflow.
Intents: plan_project, breakdown_task, analyze_risks, plan_sprint, generate_report, generate_okrs, analyze_dependencies, portfolio_intelligence, general_query.
Extract parameters from the user request for downstream agents.
Never execute actions directly — only classify and route.`,
  model: DEFAULT_MODEL,
  memory: createAgentMemory(),
});

export async function classifyIntent(
  prompt: string,
  options?: { resourceId?: string; threadId?: string },
) {
  const result = await orchestratorAgent.generate(prompt, {
    structuredOutput: { schema: orchestratorIntentSchema },
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
  });
  return result.object ?? result.text;
}

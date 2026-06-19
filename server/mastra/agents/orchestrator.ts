import { Agent } from "@mastra/core/agent";
import { DEFAULT_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { orchestratorIntentSchema } from "../schemas/orchestrator.schema.js";
import { buildJsonInstructions, parseJsonResponse } from "../utils/json-response.js";

export const orchestratorAgent = new Agent({
  id: "orchestrator",
  name: "Execution Intelligence Orchestrator",
  instructions: `You are the supervisor agent for an execution intelligence platform.
Classify user intent and route to the appropriate specialized agent or workflow.
Intents: plan_project, breakdown_task, analyze_risks, plan_sprint, generate_report, generate_okrs, analyze_dependencies, portfolio_intelligence, general_query.
Extract parameters from the user request for downstream agents.
When page context is provided (page type, entity IDs, entity snapshot), use it to bias intent selection toward the most relevant agent.
Never execute actions directly — only classify and route.
Output ONLY valid JSON matching the schema below. No text outside the JSON.
${buildJsonInstructions(orchestratorIntentSchema)}`,
  model: DEFAULT_MODEL,
  memory: createAgentMemory(),
});

export async function classifyIntent(
  prompt: string,
  options?: { resourceId?: string; threadId?: string; requestContext?: any },
) {
  const result = await orchestratorAgent.generate(prompt, {
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
    requestContext: options?.requestContext,
  });
  try {
    return parseJsonResponse(result.text, orchestratorIntentSchema);
  } catch (e) {
    throw new Error(`Failed to parse orchestrator intent: ${e instanceof Error ? e.message : e}`);
  }
}

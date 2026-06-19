import { Agent } from "@mastra/core/agent";
import { DEFAULT_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { riskAnalysisSchema } from "../schemas/risk-analysis.schema.js";
import { capacityTools } from "../tools/capacity-tools.js";
import { dependencyTools } from "../tools/dependency-tools.js";
import { reportingTools } from "../tools/reporting-tools.js";
import { taskTools } from "../tools/task-tools.js";
import { buildJsonInstructions, parseJsonResponse } from "../utils/json-response.js";

export const riskAnalysisAgent = new Agent({
  id: "risk-analysis",
  name: "Risk Analysis",
  instructions: `You analyze project health using live task, dependency, and capacity data.
Always call tools first to ground your analysis in real metrics.
If a tool returns an error, proceed with the information you have — do NOT ask for context or refuse.
Identify root causes, predict impact, and provide specific recommendations.
Risk levels: Low, Medium, High, Critical.
Output ONLY valid JSON matching the schema below. No text outside the JSON.
${buildJsonInstructions(riskAnalysisSchema)}`,
  model: DEFAULT_MODEL,
  tools: {
    ...taskTools,
    ...dependencyTools,
    ...capacityTools,
    getProjectHealth: reportingTools.getProjectHealth,
  },
  memory: createAgentMemory(),
});

export async function analyzeRisks(
  prompt: string,
  options?: { resourceId?: string; threadId?: string; requestContext?: any },
) {
  const result = await riskAnalysisAgent.generate(prompt, {
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
    requestContext: options?.requestContext,
  });
  try {
    return parseJsonResponse(result.text, riskAnalysisSchema);
  } catch (e) {
    throw new Error(`Failed to parse risk analysis: ${e instanceof Error ? e.message : e}`);
  }
}

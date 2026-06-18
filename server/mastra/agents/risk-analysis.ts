import { Agent } from "@mastra/core/agent";
import { DEFAULT_MODEL } from "../config/models.js";
import { createAgentMemory } from "../config/memory.js";
import { riskAnalysisSchema } from "../schemas/risk-analysis.schema.js";
import { capacityTools } from "../tools/capacity-tools.js";
import { dependencyTools } from "../tools/dependency-tools.js";
import { reportingTools } from "../tools/reporting-tools.js";
import { taskTools } from "../tools/task-tools.js";

export const riskAnalysisAgent = new Agent({
  id: "risk-analysis",
  name: "Risk Analysis",
  instructions: `You analyze project health using live task, dependency, and capacity data.
Always call tools first to ground your analysis in real metrics.
Identify root causes, predict impact, and provide specific recommendations.
Risk levels: Low, Medium, High, Critical.`,
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
  options?: { resourceId?: string; threadId?: string },
) {
  const result = await riskAnalysisAgent.generate(prompt, {
    structuredOutput: { schema: riskAnalysisSchema },
    memory: options?.resourceId
      ? {
          resource: options.resourceId,
          thread: options.threadId || options.resourceId,
        }
      : undefined,
  });
  return result.object ?? result.text;
}

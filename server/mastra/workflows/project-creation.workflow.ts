import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { generateProjectPlan } from "../agents/project-planner.js";
import { analyzeRisks } from "../agents/risk-analysis.js";
import { projectPlanSchema } from "../schemas/project-plan.schema.js";
import { riskAnalysisSchema } from "../schemas/risk-analysis.schema.js";
import { saveRecommendation } from "../services/artifact-store.js";
import { getExecutionContext } from "../types/tool-context.js";
import {
  projectCreationInputSchema,
  projectCreationOutputSchema,
} from "../types/workflow-io.js";

const runProjectCreationStep = createStep({
  id: "run-project-creation",
  inputSchema: projectCreationInputSchema,
  outputSchema: projectCreationOutputSchema,
  retries: 2,
  execute: async ({ inputData, requestContext }) => {
    const ctx = getExecutionContext(requestContext);
    const resourceId = `${ctx.orgId}:${ctx.userId}`;

    const prompt = `Create a complete project plan:
Name: ${inputData.name}
Description: ${inputData.description}
Deadline: ${inputData.deadline}
Team size: ${inputData.teamSize}
Objectives: ${inputData.objectives.join(", ")}`;

    const plan = (await generateProjectPlan(prompt, {
      resourceId,
    })) as z.infer<typeof projectPlanSchema>;

    const risks = (await analyzeRisks(
      `Analyze delivery risks for project "${inputData.name}" with ${plan.tasks.length} tasks due ${inputData.deadline}.`,
      { resourceId },
    )) as z.infer<typeof riskAnalysisSchema>;

    if (inputData.dryRun) {
      return { plan, risks, persisted: false };
    }

    const rec = await saveRecommendation(ctx, {
      agentId: "project-creation-workflow",
      input: inputData as Record<string, unknown>,
      output: { plan, risks },
      status: "pending",
    });

    return {
      plan,
      risks,
      persisted: true,
      recommendationId: String(rec._id),
    };
  },
});

export const projectCreationWorkflow = createWorkflow({
  id: "project-creation",
  description: "Generate milestones, tasks, dependencies, estimates, and risks",
  inputSchema: projectCreationInputSchema,
  outputSchema: projectCreationOutputSchema,
})
  .then(runProjectCreationStep)
  .commit();

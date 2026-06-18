import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { generateSprintPlan } from "../agents/sprint-planning.js";
import { sprintPlanSchema } from "../schemas/sprint-plan.schema.js";
import Sprint from "../../models/Sprint.js";
import { analyzeDependencies } from "../../services/dependencyEngine.js";
import { saveRecommendation } from "../services/artifact-store.js";
import { getExecutionContext } from "../types/tool-context.js";
import mongoose from "mongoose";

const sprintPlanningInputSchema = z.object({
  projectId: z.string(),
  sprintName: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  backlogTaskIds: z.array(z.string()).optional(),
  publish: z.boolean().optional(),
});

const sprintPlanningOutputSchema = z.object({
  plan: sprintPlanSchema,
  validation: z.object({
    hasCycles: z.boolean(),
    blockedCount: z.number(),
  }),
  published: z.boolean(),
  sprintId: z.string().optional(),
  recommendationId: z.string().optional(),
});

const runSprintPlanningStep = createStep({
  id: "run-sprint-planning",
  inputSchema: sprintPlanningInputSchema,
  outputSchema: sprintPlanningOutputSchema,
  retries: 2,
  execute: async ({ inputData, requestContext }) => {
    const ctx = getExecutionContext(requestContext);
    const resourceId = `${ctx.orgId}:${ctx.userId}`;
    const orgId = new mongoose.Types.ObjectId(ctx.orgId);

    const depAnalysis = await analyzeDependencies({ orgId });

    const prompt = `Plan sprint "${inputData.sprintName}" for project ${inputData.projectId}
from ${inputData.startDate} to ${inputData.endDate}.
Backlog task IDs: ${(inputData.backlogTaskIds || []).join(", ") || "all eligible tasks"}.
Dependency constraints: ${depAnalysis.blockedTaskIds.length} blocked tasks, critical path length ${depAnalysis.criticalPath.length}.`;

    const plan = (await generateSprintPlan(prompt, {
      resourceId,
    })) as z.infer<typeof sprintPlanSchema>;

    const validation = {
      hasCycles: depAnalysis.cycles.length > 0,
      blockedCount: depAnalysis.blockedTaskIds.length,
    };

    if (!inputData.publish || validation.hasCycles) {
      const rec = await saveRecommendation(ctx, {
        agentId: "sprint-planning-workflow",
        input: inputData as Record<string, unknown>,
        output: { plan, validation },
        status: "pending",
      });
      return {
        plan,
        validation,
        published: false,
        recommendationId: String(rec._id),
      };
    }

    const sprint = await Sprint.create({
      orgId,
      projectId: inputData.projectId,
      name: inputData.sprintName,
      startDate: new Date(inputData.startDate),
      endDate: new Date(inputData.endDate),
      status: "Planned",
      createdBy: ctx.userId,
    });

    return {
      plan,
      validation,
      published: true,
      sprintId: String(sprint._id),
    };
  },
});

export const sprintPlanningWorkflow = createWorkflow({
  id: "sprint-planning",
  description: "Generate and validate sprint plans",
  inputSchema: sprintPlanningInputSchema,
  outputSchema: sprintPlanningOutputSchema,
})
  .then(runSprintPlanningStep)
  .commit();

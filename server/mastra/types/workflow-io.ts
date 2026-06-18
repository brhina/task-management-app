import { z } from "zod";
import { projectPlanSchema } from "../schemas/project-plan.schema.js";
import { riskAnalysisSchema } from "../schemas/risk-analysis.schema.js";

export const projectCreationInputSchema = z.object({
  name: z.string(),
  description: z.string(),
  deadline: z.string(),
  teamSize: z.number(),
  objectives: z.array(z.string()),
  dryRun: z.boolean().optional(),
});

export const projectCreationOutputSchema = z.object({
  plan: projectPlanSchema,
  risks: riskAnalysisSchema,
  persisted: z.boolean().optional(),
  recommendationId: z.string().optional(),
});

export type ProjectCreationInput = z.infer<typeof projectCreationInputSchema>;
export type ProjectCreationOutput = z.infer<typeof projectCreationOutputSchema>;

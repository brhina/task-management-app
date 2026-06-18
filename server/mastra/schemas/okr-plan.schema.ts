import { z } from "zod";

export const keyResultSchema = z.object({
  title: z.string(),
  metric: z.string().optional(),
  targetValue: z.number().optional(),
  suggestedProjects: z.array(z.string()).optional(),
});

export const okrPlanSchema = z.object({
  objectives: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      keyResults: z.array(keyResultSchema),
    }),
  ),
  alignmentScore: z.number().min(0).max(100),
  suggestedProjects: z.array(
    z.object({
      name: z.string(),
      rationale: z.string(),
    }),
  ),
  summary: z.string(),
});

export type OkrPlan = z.infer<typeof okrPlanSchema>;

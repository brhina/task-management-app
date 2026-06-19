import { z } from "zod";

export const keyResultSchema = z.object({
  title: z.string().default(""),
  metric: z.string().optional(),
  targetValue: z.number().optional(),
  suggestedProjects: z.array(z.string()).optional(),
});

export const okrPlanSchema = z.object({
  objectives: z.array(
    z.object({
      title: z.string().default(""),
      description: z.string().optional(),
      keyResults: z.array(keyResultSchema).default([]),
    }),
  ).default([]),
  alignmentScore: z.number().min(0).max(100).default(50),
  suggestedProjects: z.array(
    z.object({
      name: z.string().default(""),
      rationale: z.string().default(""),
    }),
  ).default([]),
  summary: z.string().default(""),
});

export type OkrPlan = z.infer<typeof okrPlanSchema>;

import { z } from "zod";

export const dependencyIntelligenceSchema = z.object({
  impactAnalysis: z.string().default(""),
  delayForecast: z.string().default(""),
  criticalPath: z.array(z.string()).optional(),
  blockedTeams: z.array(z.string()).optional(),
  recommendedActions: z.array(z.string()).default([]),
  affectedTaskIds: z.array(z.string()).optional(),
  summary: z.string().default(""),
});

export type DependencyIntelligence = z.infer<
  typeof dependencyIntelligenceSchema
>;

import { z } from "zod";

export const dependencyIntelligenceSchema = z.object({
  impactAnalysis: z.string(),
  delayForecast: z.string(),
  criticalPath: z.array(z.string()).optional(),
  blockedTeams: z.array(z.string()).optional(),
  recommendedActions: z.array(z.string()),
  affectedTaskIds: z.array(z.string()).optional(),
  summary: z.string(),
});

export type DependencyIntelligence = z.infer<
  typeof dependencyIntelligenceSchema
>;

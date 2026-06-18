import { z } from "zod";

export const executiveIntelligenceSchema = z.object({
  portfolioHealth: z.enum(["Healthy", "At Risk", "Critical"]),
  healthScore: z.number().min(0).max(100),
  strategicRisks: z.array(
    z.object({
      title: z.string(),
      severity: z.enum(["Low", "Medium", "High", "Critical"]),
      description: z.string(),
    }),
  ),
  capacityBottlenecks: z.array(
    z.object({
      userId: z.string().optional(),
      name: z.string().optional(),
      utilizationPercent: z.number(),
      description: z.string(),
    }),
  ),
  deliveryForecasts: z.array(
    z.object({
      projectId: z.string().optional(),
      projectName: z.string(),
      forecastDate: z.string().optional(),
      confidence: z.enum(["Low", "Medium", "High"]).optional(),
      status: z.string().optional(),
    }),
  ),
  resourceRecommendations: z.array(z.string()),
  summary: z.string(),
});

export type ExecutiveIntelligence = z.infer<typeof executiveIntelligenceSchema>;

import { z } from "zod";

export const executiveIntelligenceSchema = z.object({
  portfolioHealth: z.enum(["Healthy", "At Risk", "Critical"]).default("Healthy"),
  healthScore: z.number().min(0).max(100).default(50),
  strategicRisks: z.array(
    z.object({
      title: z.string().default(""),
      severity: z.enum(["Low", "Medium", "High", "Critical"]).default("Low"),
      description: z.string().default(""),
    }),
  ).default([]),
  capacityBottlenecks: z.array(
    z.object({
      userId: z.string().optional(),
      name: z.string().optional(),
      utilizationPercent: z.number().default(0),
      description: z.string().default(""),
    }),
  ).default([]),
  deliveryForecasts: z.array(
    z.object({
      projectId: z.string().optional(),
      projectName: z.string().default(""),
      forecastDate: z.string().optional(),
      confidence: z.enum(["Low", "Medium", "High"]).optional(),
      status: z.string().optional(),
    }),
  ).default([]),
  resourceRecommendations: z.array(z.string()).default([]),
  summary: z.string().default(""),
});

export type ExecutiveIntelligence = z.infer<typeof executiveIntelligenceSchema>;

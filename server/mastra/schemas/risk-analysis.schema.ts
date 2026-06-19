import { z } from "zod";

export const riskAnalysisSchema = z.object({
  riskLevel: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
  rootCauses: z.array(z.string()).default([]),
  predictedImpact: z.string().default(""),
  recommendations: z.array(z.string()).default([]),
  affectedTaskIds: z.array(z.string()).optional(),
  healthScore: z.number().min(0).max(100).optional(),
  summary: z.string().default(""),
});

export type RiskAnalysis = z.infer<typeof riskAnalysisSchema>;

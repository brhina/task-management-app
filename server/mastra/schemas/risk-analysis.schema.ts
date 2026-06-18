import { z } from "zod";

export const riskAnalysisSchema = z.object({
  riskLevel: z.enum(["Low", "Medium", "High", "Critical"]),
  rootCauses: z.array(z.string()),
  predictedImpact: z.string(),
  recommendations: z.array(z.string()),
  affectedTaskIds: z.array(z.string()).optional(),
  healthScore: z.number().min(0).max(100).optional(),
  summary: z.string(),
});

export type RiskAnalysis = z.infer<typeof riskAnalysisSchema>;

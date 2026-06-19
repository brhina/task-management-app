import { z } from "zod";

export const orchestratorIntentSchema = z.object({
  intent: z.enum([
    "plan_project",
    "breakdown_task",
    "analyze_risks",
    "plan_sprint",
    "generate_report",
    "generate_okrs",
    "analyze_dependencies",
    "portfolio_intelligence",
    "general_query",
  ]).default("general_query"),
  confidence: z.number().min(0).max(1).default(0.5),
  suggestedWorkflow: z.string().optional(),
  suggestedAgent: z.string().optional(),
  parameters: z.record(z.unknown()).optional(),
  summary: z.string().default(""),
});

export type OrchestratorIntent = z.infer<typeof orchestratorIntentSchema>;

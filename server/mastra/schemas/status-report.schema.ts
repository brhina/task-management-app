import { z } from "zod";

export const statusReportSchema = z.object({
  reportType: z.enum(["daily", "weekly", "executive", "health"]),
  title: z.string(),
  summary: z.string(),
  highlights: z.array(z.string()),
  blockers: z.array(z.string()),
  risks: z.array(z.string()),
  metrics: z
    .object({
      totalTasks: z.number().optional(),
      completedTasks: z.number().optional(),
      overdueTasks: z.number().optional(),
      healthScore: z.number().optional(),
      utilizationPercent: z.number().optional(),
    })
    .optional(),
  recommendations: z.array(z.string()).optional(),
});

export type StatusReport = z.infer<typeof statusReportSchema>;

import { z } from "zod";

export const statusReportSchema = z.object({
  reportType: z.enum(["daily", "weekly", "executive", "health"]).default("weekly"),
  title: z.string().default("Status Report"),
  summary: z.string().default(""),
  highlights: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
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

import { z } from "zod";

export const milestoneSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  targetDate: z.string(),
  taskTitles: z.array(z.string()).optional(),
});

export const plannedTaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  effortHours: z.number().optional(),
  dependsOn: z.array(z.string()).optional(),
  milestoneTitle: z.string().optional(),
});

export const plannedDependencySchema = z.object({
  fromTask: z.string(),
  toTask: z.string(),
  type: z.enum(["FS", "SS", "FF"]).optional(),
});

export const riskItemSchema = z.object({
  title: z.string(),
  severity: z.enum(["Low", "Medium", "High", "Critical"]),
  description: z.string(),
  mitigation: z.string().optional(),
});

export const projectPlanSchema = z.object({
  milestones: z.array(milestoneSchema),
  tasks: z.array(plannedTaskSchema),
  dependencies: z.array(plannedDependencySchema),
  risks: z.array(riskItemSchema),
  estimates: z.object({
    totalEffortHours: z.number(),
    suggestedTeamSize: z.number().optional(),
    estimatedDurationWeeks: z.number().optional(),
  }),
  summary: z.string(),
});

export type ProjectPlan = z.infer<typeof projectPlanSchema>;

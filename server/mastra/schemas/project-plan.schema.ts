import { z } from "zod";

export const milestoneSchema = z.object({
  title: z.string().default("Untitled"),
  description: z.string().optional(),
  targetDate: z.string().default("TBD"),
  taskTitles: z.array(z.string()).optional(),
});

export const plannedTaskSchema = z.object({
  title: z.string().default("Untitled task"),
  description: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  effortHours: z.number().optional(),
  dependsOn: z.array(z.string()).optional(),
  milestoneTitle: z.string().optional(),
});

export const plannedDependencySchema = z.object({
  fromTask: z.string().default(""),
  toTask: z.string().default(""),
  type: z.enum(["FS", "SS", "FF"]).optional(),
});

export const riskItemSchema = z.object({
  title: z.string().default("Risk"),
  severity: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
  description: z.string().default(""),
  mitigation: z.string().optional(),
});

export const projectPlanSchema = z.object({
  milestones: z.array(milestoneSchema).default([]),
  tasks: z.array(plannedTaskSchema).default([]),
  dependencies: z.array(plannedDependencySchema).default([]),
  risks: z.array(riskItemSchema).default([]),
  estimates: z
    .object({
      totalEffortHours: z.number().default(0),
      suggestedTeamSize: z.number().optional(),
      estimatedDurationWeeks: z.number().optional(),
    })
    .default({ totalEffortHours: 0 }),
  summary: z.string().default(""),
});

export type ProjectPlan = z.infer<typeof projectPlanSchema>;

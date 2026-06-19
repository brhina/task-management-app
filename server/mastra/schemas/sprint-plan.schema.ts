import { z } from "zod";

export const sprintAssignmentSchema = z.object({
  taskId: z.string().optional(),
  taskTitle: z.string().default("Untitled"),
  assigneeId: z.string().optional(),
  assigneeName: z.string().optional(),
  effortHours: z.number().default(0),
});

export const sprintPlanSchema = z.object({
  sprintName: z.string().default("Sprint"),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  assignments: z.array(sprintAssignmentSchema).default([]),
  teamAllocation: z
    .array(
      z.object({
        userId: z.string().default(""),
        name: z.string().optional(),
        allocatedHours: z.number().default(0),
        utilizationPercent: z.number().default(0),
      }),
    )
    .default([]),
  forecastCompletionDate: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  summary: z.string().default(""),
});

export type SprintPlan = z.infer<typeof sprintPlanSchema>;

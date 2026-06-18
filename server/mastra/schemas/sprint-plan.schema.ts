import { z } from "zod";

export const sprintAssignmentSchema = z.object({
  taskId: z.string().optional(),
  taskTitle: z.string(),
  assigneeId: z.string().optional(),
  assigneeName: z.string().optional(),
  effortHours: z.number(),
});

export const sprintPlanSchema = z.object({
  sprintName: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  assignments: z.array(sprintAssignmentSchema),
  teamAllocation: z.array(
    z.object({
      userId: z.string(),
      name: z.string().optional(),
      allocatedHours: z.number(),
      utilizationPercent: z.number(),
    }),
  ),
  forecastCompletionDate: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  summary: z.string(),
});

export type SprintPlan = z.infer<typeof sprintPlanSchema>;

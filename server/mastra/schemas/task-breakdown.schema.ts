import { z } from "zod";

export const subtaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  acceptanceCriteria: z.array(z.string()),
  complexityScore: z.number().min(1).max(10),
  estimatedHours: z.number().min(0),
});

export const taskBreakdownSchema = z.object({
  parentTaskTitle: z.string(),
  subtasks: z.array(subtaskSchema),
  totalEstimatedHours: z.number(),
  summary: z.string(),
});

export type TaskBreakdown = z.infer<typeof taskBreakdownSchema>;

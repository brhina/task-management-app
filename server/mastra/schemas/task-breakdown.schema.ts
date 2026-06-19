import { z } from "zod";

export const subtaskSchema = z.object({
  title: z.string().default("Untitled"),
  description: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).default([]),
  complexityScore: z.number().min(1).max(10).default(5),
  estimatedHours: z.number().min(0).default(0),
});

export const taskBreakdownSchema = z.object({
  parentTaskTitle: z.string().default(""),
  subtasks: z.array(subtaskSchema).default([]),
  totalEstimatedHours: z.number().default(0),
  summary: z.string().default(""),
});

export type TaskBreakdown = z.infer<typeof taskBreakdownSchema>;

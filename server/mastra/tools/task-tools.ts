import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  assignTask,
  createTask,
  getTask,
  listTasks,
  updateTask,
} from "../services/taskService.js";
import { getExecutionContext } from "../types/tool-context.js";

export const getTaskTool = createTool({
  id: "getTask",
  description: "Get a task by ID",
  inputSchema: z.object({ taskId: z.string() }),
  execute: async (inputData, context) => {
    const ctx = getExecutionContext(context?.requestContext);
    const task = await getTask(ctx, inputData.taskId);
    if (!task) return { error: "Task not found", retryable: false };
    return { task };
  },
});

export const getTasksTool = createTool({
  id: "getTasks",
  description: "List tasks with optional filters",
  inputSchema: z.object({
    status: z.string().optional(),
    projectId: z.string().optional(),
    assignedTo: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const ctx = getExecutionContext(context?.requestContext);
    const tasks = await listTasks(ctx, inputData);
    return { tasks, count: tasks.length };
  },
});

export const createTaskTool = createTool({
  id: "createTask",
  description: "Create a new task (use dryRun to preview)",
  inputSchema: z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(["Low", "Medium", "High"]).optional(),
    dueDate: z.string(),
    assignedTo: z.string(),
    projectId: z.string().optional(),
    goalIds: z.array(z.string()).optional(),
    effortHours: z.number().optional(),
    impactScore: z.number().optional(),
    dryRun: z.boolean().optional(),
  }),
  execute: async (inputData, context) => {
    const ctx = getExecutionContext(context?.requestContext);
    return createTask(ctx, {
      ...inputData,
      dueDate: new Date(inputData.dueDate),
    });
  },
});

export const updateTaskTool = createTool({
  id: "updateTask",
  description: "Update an existing task",
  inputSchema: z.object({
    taskId: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(["Low", "Medium", "High"]).optional(),
    dueDate: z.string().optional(),
    status: z.string().optional(),
    effortHours: z.number().optional(),
    dryRun: z.boolean().optional(),
  }),
  execute: async (inputData, context) => {
    const ctx = getExecutionContext(context?.requestContext);
    const { taskId, dueDate, ...rest } = inputData;
    const result = await updateTask(ctx, taskId, {
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });
    if (!result) return { error: "Task not found", retryable: false };
    return result;
  },
});

export const assignTaskTool = createTool({
  id: "assignTask",
  description: "Assign a task to a user",
  inputSchema: z.object({
    taskId: z.string(),
    assignedTo: z.string(),
    dryRun: z.boolean().optional(),
  }),
  execute: async (inputData, context) => {
    const ctx = getExecutionContext(context?.requestContext);
    const result = await assignTask(
      ctx,
      inputData.taskId,
      inputData.assignedTo,
      inputData.dryRun,
    );
    if (!result) return { error: "Task not found", retryable: false };
    return result;
  },
});

export const taskTools = {
  getTask: getTaskTool,
  getTasks: getTasksTool,
  createTask: createTaskTool,
  updateTask: updateTaskTool,
  assignTask: assignTaskTool,
};

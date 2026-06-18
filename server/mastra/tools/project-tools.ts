import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
} from "../services/projectService.js";
import { getExecutionContext } from "../types/tool-context.js";

export const getProjectTool = createTool({
  id: "getProject",
  description: "Get a project by ID with optional tasks",
  inputSchema: z.object({
    projectId: z.string(),
    includeTasks: z.boolean().optional(),
  }),
  execute: async (inputData, context) => {
    const ctx = getExecutionContext(context?.requestContext);
    const result = await getProject(
      ctx,
      inputData.projectId,
      inputData.includeTasks,
    );
    if (!result) return { error: "Project not found", retryable: false };
    return result;
  },
});

export const getProjectsTool = createTool({
  id: "getProjects",
  description: "List all projects in the organization",
  inputSchema: z.object({}),
  execute: async (_inputData, context) => {
    const ctx = getExecutionContext(context?.requestContext);
    const projects = await listProjects(ctx);
    return { projects };
  },
});

export const createProjectTool = createTool({
  id: "createProject",
  description: "Create a new project (use dryRun to preview)",
  inputSchema: z.object({
    name: z.string(),
    description: z.string().optional(),
    status: z.string().optional(),
    startDate: z.string().optional(),
    targetDate: z.string().optional(),
    ownerId: z.string().optional(),
    dryRun: z.boolean().optional(),
  }),
  execute: async (inputData, context) => {
    const ctx = getExecutionContext(context?.requestContext);
    return createProject(ctx, {
      name: inputData.name,
      description: inputData.description,
      status: inputData.status,
      startDate: inputData.startDate
        ? new Date(inputData.startDate)
        : undefined,
      targetDate: inputData.targetDate
        ? new Date(inputData.targetDate)
        : undefined,
      ownerId: inputData.ownerId,
      dryRun: inputData.dryRun,
    });
  },
});

export const updateProjectTool = createTool({
  id: "updateProject",
  description: "Update an existing project",
  inputSchema: z.object({
    projectId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    startDate: z.string().optional(),
    targetDate: z.string().optional(),
    ownerId: z.string().optional(),
    dryRun: z.boolean().optional(),
  }),
  execute: async (inputData, context) => {
    const ctx = getExecutionContext(context?.requestContext);
    const result = await updateProject(ctx, inputData.projectId, {
      name: inputData.name,
      description: inputData.description,
      status: inputData.status,
      startDate: inputData.startDate
        ? new Date(inputData.startDate)
        : undefined,
      targetDate: inputData.targetDate
        ? new Date(inputData.targetDate)
        : undefined,
      ownerId: inputData.ownerId,
      dryRun: inputData.dryRun,
    });
    if (!result) return { error: "Project not found", retryable: false };
    return result;
  },
});

export const projectTools = {
  getProject: getProjectTool,
  getProjects: getProjectsTool,
  createProject: createProjectTool,
  updateProject: updateProjectTool,
};

import { createTool } from "@mastra/core/tools";
import mongoose from "mongoose";
import { z } from "zod";
import Dependency from "../../models/Dependency.js";
import { analyzeDependencies } from "../../services/dependencyEngine.js";
import { getExecutionContext } from "../types/tool-context.js";

export const getDependenciesTool = createTool({
  id: "getDependencies",
  description: "Get task dependencies for the organization or a specific task",
  inputSchema: z.object({ taskId: z.string().optional() }),
  execute: async (inputData, context) => {
    const ctx = getExecutionContext(context?.requestContext);
    const filter: Record<string, unknown> = {
      orgId: new mongoose.Types.ObjectId(ctx.orgId),
    };
    if (inputData.taskId) {
      filter.$or = [
        { fromTaskId: inputData.taskId },
        { toTaskId: inputData.taskId },
      ];
    }

    const deps = await Dependency.find(filter)
      .sort({ createdAt: -1 })
      .populate("fromTaskId", "title status")
      .populate("toTaskId", "title status");

    return { dependencies: deps, count: deps.length };
  },
});

export const analyzeCriticalPathTool = createTool({
  id: "analyzeCriticalPath",
  description:
    "Analyze dependency graph: critical path, blocked tasks, bottlenecks",
  inputSchema: z.object({}),
  execute: async (_inputData, context) => {
    const ctx = getExecutionContext(context?.requestContext);
    const analysis = await analyzeDependencies({
      orgId: new mongoose.Types.ObjectId(ctx.orgId),
    });
    return analysis;
  },
});

export const detectCyclesTool = createTool({
  id: "detectCycles",
  description: "Detect circular dependencies in the task graph",
  inputSchema: z.object({}),
  execute: async (_inputData, context) => {
    const ctx = getExecutionContext(context?.requestContext);
    const analysis = await analyzeDependencies({
      orgId: new mongoose.Types.ObjectId(ctx.orgId),
    });
    return {
      cycles: analysis.cycles,
      hasCycles: analysis.cycles.length > 0,
      cycleCount: analysis.cycles.length,
    };
  },
});

export const dependencyTools = {
  getDependencies: getDependenciesTool,
  analyzeCriticalPath: analyzeCriticalPathTool,
  detectCycles: detectCyclesTool,
};

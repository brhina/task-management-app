import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  calculateUtilization,
  getCapacity,
  getWorkload,
} from "../services/capacityService.js";
import { getExecutionContext } from "../types/tool-context.js";

function safeGetCtx(context?: any) {
  try {
    return getExecutionContext(context?.requestContext);
  } catch {
    return null;
  }
}

export const getCapacityTool = createTool({
  id: "getCapacity",
  description: "Get team capacity per member for the organization",
  inputSchema: z.object({}),
  execute: async (_inputData, context) => {
    const ctx = safeGetCtx(context);
    if (!ctx) return { error: "Missing execution context (orgId/userId)" };
    const capacity = await getCapacity(ctx);
    return { capacity };
  },
});

export const getWorkloadTool = createTool({
  id: "getWorkload",
  description: "Get workload distribution for the next N days",
  inputSchema: z.object({ daysAhead: z.number().optional() }),
  execute: async (inputData, context) => {
    const ctx = safeGetCtx(context);
    if (!ctx) return { error: "Missing execution context (orgId/userId)" };
    const workload = await getWorkload(ctx, inputData.daysAhead ?? 7);
    return { workload };
  },
});

export const calculateUtilizationTool = createTool({
  id: "calculateUtilization",
  description: "Calculate capacity utilization per team member",
  inputSchema: z.object({}),
  execute: async (_inputData, context) => {
    const ctx = safeGetCtx(context);
    if (!ctx) return { error: "Missing execution context (orgId/userId)" };
    const utilization = await calculateUtilization(ctx);
    return { utilization };
  },
});

export const capacityTools = {
  getCapacity: getCapacityTool,
  getWorkload: getWorkloadTool,
  calculateUtilization: calculateUtilizationTool,
};

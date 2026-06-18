import { createTool } from "@mastra/core/tools";
import mongoose from "mongoose";
import { z } from "zod";
import {
  buildOrgWorkosSummary,
  buildProjectWorkosSummary,
} from "../../services/workosSummary.js";
import { getExecutionContext } from "../types/tool-context.js";

export const getProjectHealthTool = createTool({
  id: "getProjectHealth",
  description: "Get project or org health metrics from WorkOS engine",
  inputSchema: z.object({
    projectId: z.string().optional(),
    scope: z.enum(["org", "project"]).optional(),
  }),
  execute: async (inputData, context) => {
    const ctx = getExecutionContext(context?.requestContext);
    const orgId = new mongoose.Types.ObjectId(ctx.orgId);

    if (inputData.projectId || inputData.scope === "project") {
      if (!inputData.projectId) {
        return { error: "projectId required for project scope", retryable: false };
      }
      const summary = await buildProjectWorkosSummary({
        orgId,
        projectId: inputData.projectId,
      });
      return { scope: "project", health: summary };
    }

    const summary = await buildOrgWorkosSummary({ orgId });
    return { scope: "org", health: summary };
  },
});

export const generateReportTool = createTool({
  id: "generateReport",
  description: "Generate structured report data for intelligence agents",
  inputSchema: z.object({
    reportType: z
      .enum(["daily", "weekly", "executive", "health"])
      .optional(),
    projectId: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const ctx = getExecutionContext(context?.requestContext);
    const orgId = new mongoose.Types.ObjectId(ctx.orgId);

    if (inputData.projectId) {
      const health = await buildProjectWorkosSummary({
        orgId,
        projectId: inputData.projectId,
      });
      return {
        reportType: inputData.reportType || "health",
        data: health,
      };
    }

    const health = await buildOrgWorkosSummary({ orgId });
    return {
      reportType: inputData.reportType || "executive",
      data: health,
    };
  },
});

export const reportingTools = {
  getProjectHealth: getProjectHealthTool,
  generateReport: generateReportTool,
};

import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { generateExecutiveIntelligence } from "../agents/executive-intelligence.js";
import { executiveIntelligenceSchema } from "../schemas/executive-intelligence.schema.js";
import InsightSnapshot from "../../models/InsightSnapshot.js";
import { buildOrgWorkosSummary } from "../../services/workosSummary.js";
import { getExecutionContext } from "../types/tool-context.js";
import mongoose from "mongoose";

const executiveReportingInputSchema = z.object({});

const executiveReportingOutputSchema = z.object({
  intelligence: executiveIntelligenceSchema,
  healthScore: z.number(),
  snapshotId: z.string(),
});

const runExecutiveReportingStep = createStep({
  id: "run-executive-reporting",
  inputSchema: executiveReportingInputSchema,
  outputSchema: executiveReportingOutputSchema,
  retries: 2,
  execute: async ({ requestContext }) => {
    const ctx = getExecutionContext(requestContext);
    const orgId = new mongoose.Types.ObjectId(ctx.orgId);
    const resourceId = `${ctx.orgId}:${ctx.userId}`;

    const summary = await buildOrgWorkosSummary({ orgId });
    const intelligence = (await generateExecutiveIntelligence(
      `Generate executive portfolio report. Current metrics: ${JSON.stringify({
        healthStatus: summary.health_status,
        riskLevel: summary.risk?.level,
        utilization: summary.workload?.capacity_utilization,
      })}`,
      { resourceId },
    )) as z.infer<typeof executiveIntelligenceSchema>;

    const snapshot = await InsightSnapshot.create({
      orgId,
      scopeType: "Org",
      scopeId: orgId,
      computedAt: new Date(),
      payload: { intelligence, summary },
    });

    return {
      intelligence,
      healthScore: intelligence.healthScore,
      snapshotId: String(snapshot._id),
    };
  },
});

export const executiveReportingWorkflow = createWorkflow({
  id: "executive-reporting",
  description: "Collect portfolio data and generate executive summary",
  inputSchema: executiveReportingInputSchema,
  outputSchema: executiveReportingOutputSchema,
})
  .then(runExecutiveReportingStep)
  .commit();

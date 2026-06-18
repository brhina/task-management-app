import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { analyzeRisks } from "../agents/risk-analysis.js";
import { generateExecutiveIntelligence } from "../agents/executive-intelligence.js";
import { riskAnalysisSchema } from "../schemas/risk-analysis.schema.js";
import InsightSnapshot from "../../models/InsightSnapshot.js";
import Project from "../../models/Project.js";
import { buildOrgWorkosSummary } from "../../services/workosSummary.js";
import { getExecutionContext } from "../types/tool-context.js";
import mongoose from "mongoose";

const riskMonitoringInputSchema = z.object({
  orgId: z.string().optional(),
});

const riskMonitoringOutputSchema = z.object({
  projectsAnalyzed: z.number(),
  orgRisk: riskAnalysisSchema.optional(),
  executiveSummary: z.string().optional(),
  snapshotId: z.string().optional(),
});

const runRiskMonitoringStep = createStep({
  id: "run-risk-monitoring",
  inputSchema: riskMonitoringInputSchema,
  outputSchema: riskMonitoringOutputSchema,
  retries: 2,
  execute: async ({ requestContext }) => {
    const ctx = getExecutionContext(requestContext);
    const orgId = new mongoose.Types.ObjectId(ctx.orgId);
    const resourceId = `${ctx.orgId}:${ctx.userId}`;

    const projects = await Project.find({ orgId, status: "Active" });
    const orgRisk = (await analyzeRisks(
      "Perform organization-wide risk analysis for all active projects.",
      { resourceId },
    )) as z.infer<typeof riskAnalysisSchema>;

    const executive = await generateExecutiveIntelligence(
      "Generate executive risk summary and recommendations for stakeholders.",
      { resourceId },
    );

    const payload = await buildOrgWorkosSummary({ orgId });
    const snapshot = await InsightSnapshot.create({
      orgId,
      scopeType: "Org",
      scopeId: orgId,
      computedAt: new Date(),
      payload: { ...payload, orgRisk, executive },
    });

    return {
      projectsAnalyzed: projects.length,
      orgRisk,
      executiveSummary:
        typeof executive === "object" && executive && "summary" in executive
          ? String((executive as { summary: string }).summary)
          : undefined,
      snapshotId: String(snapshot._id),
    };
  },
});

export const riskMonitoringWorkflow = createWorkflow({
  id: "risk-monitoring",
  description: "Scheduled risk monitoring across active projects",
  inputSchema: riskMonitoringInputSchema,
  outputSchema: riskMonitoringOutputSchema,
})
  .then(runRiskMonitoringStep)
  .commit();

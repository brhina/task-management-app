import { Mastra } from "@mastra/core";
import { projectPlannerAgent } from "./agents/project-planner.js";
import { taskBreakdownAgent } from "./agents/task-breakdown.js";
import { riskAnalysisAgent } from "./agents/risk-analysis.js";
import { sprintPlanningAgent } from "./agents/sprint-planning.js";
import { statusReportAgent } from "./agents/status-report.js";
import { okrAssistantAgent } from "./agents/okr-assistant.js";
import { dependencyIntelligenceAgent } from "./agents/dependency-intelligence.js";
import { executiveIntelligenceAgent } from "./agents/executive-intelligence.js";
import { getMongoDBStore } from "./config/memory.js";
import { projectCreationWorkflow } from "./workflows/project-creation.workflow.js";
import { riskMonitoringWorkflow } from "./workflows/risk-monitoring.workflow.js";
import { sprintPlanningWorkflow } from "./workflows/sprint-planning.workflow.js";
import { executiveReportingWorkflow } from "./workflows/executive-reporting.workflow.js";

let mastraInstance: Mastra | null = null;

export function getMastra(): Mastra {
  if (!mastraInstance) {
    mastraInstance = new Mastra({
      storage: getMongoDBStore(),
      agents: {
        projectPlanner: projectPlannerAgent,
        taskBreakdown: taskBreakdownAgent,
        riskAnalysis: riskAnalysisAgent,
        sprintPlanning: sprintPlanningAgent,
        statusReport: statusReportAgent,
        okrAssistant: okrAssistantAgent,
        dependencyIntelligence: dependencyIntelligenceAgent,
        executiveIntelligence: executiveIntelligenceAgent,
      },
      workflows: {
        projectCreation: projectCreationWorkflow,
        riskMonitoring: riskMonitoringWorkflow,
        sprintPlanning: sprintPlanningWorkflow,
        executiveReporting: executiveReportingWorkflow,
      },
    });
  }
  return mastraInstance;
}

export { getMastra as mastra };

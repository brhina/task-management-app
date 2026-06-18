export type { ExecutionContext } from "../config/context.js";
export type { ProjectPlan } from "../schemas/project-plan.schema.js";
export type { TaskBreakdown } from "../schemas/task-breakdown.schema.js";
export type { RiskAnalysis } from "../schemas/risk-analysis.schema.js";
export type { SprintPlan } from "../schemas/sprint-plan.schema.js";
export type { StatusReport } from "../schemas/status-report.schema.js";
export type { OkrPlan } from "../schemas/okr-plan.schema.js";
export type { DependencyIntelligence } from "../schemas/dependency-intelligence.schema.js";
export type { ExecutiveIntelligence } from "../schemas/executive-intelligence.schema.js";
export type { OrchestratorIntent } from "../schemas/orchestrator.schema.js";

export interface ProjectCreationInput {
  name: string;
  description: string;
  deadline: string;
  teamSize: number;
  objectives: string[];
  dryRun?: boolean;
}

export interface TaskBreakdownInput {
  taskId?: string;
  taskTitle: string;
  taskDescription?: string;
}

export interface RiskAnalysisInput {
  projectId?: string;
  scope?: "org" | "project";
}

export interface SprintPlanningInput {
  projectId?: string;
  sprintName?: string;
  startDate: string;
  endDate: string;
  backlogTaskIds?: string[];
}

export interface StatusReportInput {
  reportType: "daily" | "weekly" | "executive" | "health";
  projectId?: string;
}

export interface OkrInput {
  timeframe?: string;
  focus?: string;
}

export interface DependencyAnalysisInput {
  taskId?: string;
  question?: string;
}

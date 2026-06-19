import type {
  ExecutiveIntelligence,
  PlannedTask,
  ProjectPlan,
  Recommendation,
  RiskAnalysis,
  SprintPlan,
  StatusReport,
  StoredWorkflowRunRef,
  TaskBreakdown,
} from '../types/intelligence';

const WORKFLOW_RUNS_KEY = 'intelligence:workflowRuns';

export function getRiskLevelColor(level: string): string {
  switch (level) {
    case 'Critical':
      return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    case 'High':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    case 'Medium':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    default:
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  }
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'accepted':
      return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30';
    case 'rejected':
      return 'text-slate-400 bg-slate-500/15 border-slate-500/30';
    case 'completed':
      return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30';
    case 'failed':
      return 'text-rose-300 bg-rose-500/15 border-rose-500/30';
    case 'running':
      return 'text-sky-300 bg-sky-500/15 border-sky-500/30';
    default:
      return 'text-amber-300 bg-amber-500/15 border-amber-500/30';
  }
}

export function normalizeProjectPlan(data: unknown): ProjectPlan | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const nested = obj.result as Record<string, unknown> | undefined;
  const plan = (nested?.plan ?? obj.plan ?? obj) as ProjectPlan;
  if (!plan?.tasks || !plan?.milestones) return null;
  return plan;
}

export function normalizeRiskAnalysis(data: unknown): RiskAnalysis | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const risks = (obj.result ?? obj.risks ?? obj) as RiskAnalysis;
  if (!risks?.riskLevel) return null;
  return risks;
}

export function normalizeTaskBreakdown(data: unknown): TaskBreakdown | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const nested = obj.data as Record<string, unknown> | undefined;
  const result = (obj.result ?? nested?.result ?? obj) as TaskBreakdown;
  if (!result?.subtasks) return null;
  return result;
}

export function normalizeSprintPlan(data: unknown): SprintPlan | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const nested = obj.result as Record<string, unknown> | undefined;
  const plan = (nested?.plan ?? obj.plan ?? obj) as SprintPlan;
  if (!plan?.sprintName) return null;
  return plan;
}

export function normalizeStatusReport(data: unknown): StatusReport | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const report = (obj.result ?? obj) as StatusReport;
  if (!report?.reportType && !report?.summary) return null;
  return report;
}

export function normalizeExecutive(data: unknown): ExecutiveIntelligence | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const intel = (obj.result ?? obj.intelligence ?? obj) as ExecutiveIntelligence;
  if (!intel?.portfolioHealth) return null;
  return intel;
}

export function groupTasksByMilestone(tasks: PlannedTask[]): Map<string, PlannedTask[]> {
  const map = new Map<string, PlannedTask[]>();
  for (const task of tasks) {
    const key = task.milestoneTitle || 'Unassigned';
    const list = map.get(key) || [];
    list.push(task);
    map.set(key, list);
  }
  return map;
}

export function formatAgentLabel(agentId: string): string {
  return agentId
    .replace(/-workflow$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getRecommendationSummary(rec: Recommendation): string {
  const output = rec.output;
  if (typeof output.summary === 'string') return output.summary;
  const plan = output.plan as ProjectPlan | undefined;
  if (plan?.summary) return plan.summary;
  const risks = output.risks as RiskAnalysis | undefined;
  if (risks?.summary) return risks.summary;
  return `${formatAgentLabel(rec.agentId)} recommendation`;
}

export function loadStoredWorkflowRuns(orgId: string): StoredWorkflowRunRef[] {
  try {
    const raw = localStorage.getItem(`${WORKFLOW_RUNS_KEY}:${orgId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredWorkflowRunRef[];
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function saveWorkflowRunRef(orgId: string, ref: StoredWorkflowRunRef): void {
  const existing = loadStoredWorkflowRuns(orgId).filter((r) => r.id !== ref.id);
  const next = [ref, ...existing].slice(0, 10);
  localStorage.setItem(`${WORKFLOW_RUNS_KEY}:${orgId}`, JSON.stringify(next));
}

export function saveJobEnqueueRef(
  orgId: string,
  jobId: string,
  workflowId: string,
  label: string
): void {
  saveWorkflowRunRef(orgId, {
    id: jobId,
    workflowId,
    label,
    status: 'enqueued',
    createdAt: new Date().toISOString(),
  });
}

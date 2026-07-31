import type { ITaskDocument } from "../models/Task.js";

export type PriorityLevel = "Critical" | "High" | "Medium" | "Low";
export type HealthStatus = "on_track" | "at_risk" | "delayed" | "critical";
export type RiskLevel = "Low" | "Moderate" | "High" | "Critical";

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function daysUntil(d: Date): number {
  const ms = d.getTime() - Date.now();
  return ms / (1000 * 60 * 60 * 24);
}

export function urgencyScore(
  task: Pick<ITaskDocument, "dueDate" | "status">,
): number {
  if (!task.dueDate) return 0;
  if (task.status === "Completed") return 0;
  const du = daysUntil(new Date(task.dueDate));
  if (du < 0) return 30; // overdue
  if (du <= 1) return 25;
  if (du <= 3) return 20;
  if (du <= 7) return 14;
  if (du <= 14) return 8;
  return 3;
}

export function impactScorePoints(impactScore?: number): number {
  const v = clamp(Number(impactScore ?? 5), 0, 10);
  // 0..10 -> 0..25
  return Math.round((v / 10) * 25);
}

export function strategicAlignmentPoints(goalCount?: number): number {
  const g = clamp(Number(goalCount ?? 0), 0, 5);
  return Math.round((g / 5) * 10);
}

export function delayTolerancePenalty(
  priority: "Low" | "Medium" | "High",
): number {
  // Higher priority means less tolerance to delay.
  if (priority === "High") return 0;
  if (priority === "Medium") return 4;
  return 8;
}

export function classifyPriority(score: number): PriorityLevel {
  if (score >= 90) return "Critical";
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export function classifyRisk(score: number): RiskLevel {
  if (score >= 85) return "Critical";
  if (score >= 60) return "High";
  if (score >= 35) return "Moderate";
  return "Low";
}

export function healthFromRiskAndOverdue(params: {
  riskScore: number;
  overdueCount: number;
  blockedCount: number;
}): HealthStatus {
  if (params.overdueCount > 0 && params.riskScore >= 70) return "critical";
  if (
    params.overdueCount > 0 ||
    params.blockedCount > 5 ||
    params.riskScore >= 70
  )
    return "delayed";
  if (params.blockedCount > 0 || params.riskScore >= 40) return "at_risk";
  return "on_track";
}

export type WorkloadStatus = "Optimal" | "Overloaded" | "Available";

export function classifyWorkloadStatus(utilizationRate: number): WorkloadStatus {
  if (utilizationRate > 110) return "Overloaded";
  if (utilizationRate < 50) return "Available";
  return "Optimal";
}

export interface HealthMetrics {
  score: number; // 0-100
  status: HealthStatus;
  executionScore: number; // completion & on-time performance (0-100)
  velocityScore: number; // throughput (0-100)
  riskScore: number; // inverse of risk penalty (0-100)
  alignmentScore: number; // strategic goal linking (0-100)
}

export function calculateHealthMetrics(params: {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  avgRiskScore: number;
  goalsLinkedCount: number;
  totalGoalsCount: number;
  overloadedMembersCount: number;
  totalMembersCount: number;
}): HealthMetrics {
  const {
    totalTasks,
    completedTasks,
    overdueTasks,
    blockedTasks,
    avgRiskScore,
    goalsLinkedCount,
    totalGoalsCount,
    overloadedMembersCount,
    totalMembersCount,
  } = params;

  // 1. Execution Score (0..100)
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;
  const overdueRatio = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;
  const executionScore = clamp(Math.round(completionRate * 0.6 + (100 - overdueRatio * 2) * 0.4), 0, 100);

  // 2. Velocity / Flow Score (0..100)
  const blockedRatio = totalTasks > 0 ? (blockedTasks / totalTasks) * 100 : 0;
  const velocityScore = clamp(Math.round(100 - blockedRatio * 2.5 - (overloadedMembersCount > 0 ? 15 : 0)), 0, 100);

  // 3. Risk Score (0..100, where 100 means low risk / safe)
  const riskSafetyScore = clamp(100 - Math.round(avgRiskScore), 0, 100);

  // 4. Alignment Score (0..100)
  const alignmentRate = totalGoalsCount > 0 ? clamp((goalsLinkedCount / totalGoalsCount) * 100, 20, 100) : 50;
  const alignmentScore = Math.round(alignmentRate);

  // Composite overall score
  const score = clamp(
    Math.round(executionScore * 0.3 + velocityScore * 0.25 + riskSafetyScore * 0.25 + alignmentScore * 0.2),
    0,
    100
  );

  const status = healthFromRiskAndOverdue({
    riskScore: avgRiskScore,
    overdueCount: overdueTasks,
    blockedCount: blockedTasks,
  });

  return {
    score,
    status,
    executionScore,
    velocityScore,
    riskScore: riskSafetyScore,
    alignmentScore,
  };
}


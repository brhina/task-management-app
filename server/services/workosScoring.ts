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

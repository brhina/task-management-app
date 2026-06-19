export type RecommendationStatus = 'pending' | 'accepted' | 'rejected';

export type IntelligenceTab =
  | 'overview'
  | 'planner'
  | 'breakdown'
  | 'risks'
  | 'sprint'
  | 'reports'
  | 'recommendations'
  | 'jobs';

export interface Milestone {
  title: string;
  description?: string;
  targetDate: string;
  taskTitles?: string[];
}

export interface PlannedTask {
  title: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High';
  effortHours?: number;
  dependsOn?: string[];
  milestoneTitle?: string;
}

export interface PlannedDependency {
  fromTask: string;
  toTask: string;
  type?: 'FS' | 'SS' | 'FF';
}

export interface RiskItem {
  title: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  mitigation?: string;
}

export interface ProjectPlan {
  milestones: Milestone[];
  tasks: PlannedTask[];
  dependencies: PlannedDependency[];
  risks: RiskItem[];
  estimates: {
    totalEffortHours: number;
    suggestedTeamSize?: number;
    estimatedDurationWeeks?: number;
  };
  summary: string;
}

export interface RiskAnalysis {
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  rootCauses: string[];
  predictedImpact: string;
  recommendations: string[];
  affectedTaskIds?: string[];
  healthScore?: number;
  summary: string;
}

export interface TaskBreakdown {
  parentTaskTitle: string;
  subtasks: Array<{
    title: string;
    description?: string;
    acceptanceCriteria: string[];
    complexityScore: number;
    estimatedHours: number;
  }>;
  totalEstimatedHours: number;
  summary: string;
}

export interface SprintPlan {
  sprintName: string;
  startDate: string;
  endDate: string;
  assignments: Array<{
    taskId?: string;
    taskTitle: string;
    assigneeId?: string;
    assigneeName?: string;
    effortHours: number;
  }>;
  teamAllocation: Array<{
    userId: string;
    name?: string;
    allocatedHours: number;
    utilizationPercent: number;
  }>;
  forecastCompletionDate?: string;
  warnings?: string[];
  summary: string;
}

export interface StatusReport {
  reportType: 'daily' | 'weekly' | 'executive' | 'health';
  title: string;
  summary: string;
  highlights: string[];
  blockers: string[];
  risks: string[];
  metrics?: {
    totalTasks?: number;
    completedTasks?: number;
    overdueTasks?: number;
    healthScore?: number;
    utilizationPercent?: number;
  };
  recommendations?: string[];
}

export interface ExecutiveIntelligence {
  portfolioHealth: 'Healthy' | 'At Risk' | 'Critical';
  healthScore: number;
  strategicRisks: Array<{
    title: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    description: string;
  }>;
  capacityBottlenecks: Array<{
    userId?: string;
    name?: string;
    utilizationPercent: number;
    description: string;
  }>;
  deliveryForecasts: Array<{
    projectId?: string;
    projectName: string;
    forecastDate?: string;
    confidence?: 'Low' | 'Medium' | 'High';
    status?: string;
  }>;
  resourceRecommendations: string[];
  summary: string;
}

export interface Recommendation {
  _id: string;
  agentId: string;
  workflowRunId?: string;
  status: RecommendationStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkflowRun {
  _id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'suspended';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface StoredWorkflowRunRef {
  id: string;
  workflowId: string;
  label: string;
  status: string;
  createdAt: string;
}

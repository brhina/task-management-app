import type { PageType, QuickAction } from '../types/intelligence';

const defaultActionsCache = new Map<PageType, QuickAction[]>();

export function getDefaultQuickActions(pageType: PageType): QuickAction[] {
  const cached = defaultActionsCache.get(pageType);
  if (cached) return cached;

  const actions = buildDefaultQuickActions(pageType);
  defaultActionsCache.set(pageType, actions);
  return actions;
}

function buildDefaultQuickActions(pageType: PageType): QuickAction[] {
  switch (pageType) {
    case 'dashboard':
      return [
        {
          id: 'portfolio',
          label: 'Portfolio summary',
          message: 'Provide portfolio-level executive intelligence for all active projects.',
          preferredIntent: 'portfolio_intelligence',
          loadingLabel: 'Analyzing portfolio…',
        },
        {
          id: 'risks',
          label: 'Top risks',
          message: 'Analyze organization-wide project risks and highlight the most critical items.',
          preferredIntent: 'analyze_risks',
          loadingLabel: 'Analyzing risks…',
        },
      ];
    case 'workos':
      return [
        {
          id: 'org-risks',
          label: 'Analyze org risks',
          message: 'Analyze organization-wide execution risks based on current priorities and blockers.',
          preferredIntent: 'analyze_risks',
          loadingLabel: 'Analyzing risks…',
        },
        {
          id: 'daily-report',
          label: 'Daily report',
          message: 'Generate a daily status report for the organization.',
          preferredIntent: 'generate_report',
          loadingLabel: 'Generating report…',
        },
        {
          id: 'insights',
          label: 'Executive insights',
          message: 'Provide executive-level portfolio intelligence and strategic recommendations.',
          preferredIntent: 'portfolio_intelligence',
          loadingLabel: 'Loading insights…',
        },
      ];
    case 'projects':
      return [
        {
          id: 'plan-project',
          label: 'Plan new project',
          message: 'Help me plan a new project with milestones, tasks, and risk assessment.',
          preferredIntent: 'plan_project',
          loadingLabel: 'Planning project…',
        },
      ];
    case 'project-create':
      return [
        {
          id: 'generate-plan',
          label: 'Generate plan',
          message: 'Generate a full project plan with milestones, tasks, estimates, and risks from the project details.',
          preferredIntent: 'plan_project',
          loadingLabel: 'Generating plan…',
        },
      ];
    case 'goals':
      return [
        {
          id: 'generate-okrs',
          label: 'Generate OKRs',
          message: 'Generate OKRs for the current quarter aligned with our active projects and execution priorities.',
          preferredIntent: 'generate_okrs',
          loadingLabel: 'Generating OKRs…',
        },
      ];
    case 'goal-detail':
      return [
        {
          id: 'align-krs',
          label: 'Align key results',
          message: 'Review this goal and suggest aligned key results and linked tasks.',
          preferredIntent: 'generate_okrs',
          loadingLabel: 'Aligning OKRs…',
        },
      ];
    case 'tasks':
      return [
        {
          id: 'plan-sprint',
          label: 'Plan sprint',
          message: 'Generate a capacity-aware sprint plan for the current project backlog.',
          preferredIntent: 'plan_sprint',
          loadingLabel: 'Planning sprint…',
        },
        {
          id: 'analyze-deps',
          label: 'Analyze dependencies',
          message: 'Analyze critical path and dependency bottlenecks across current tasks.',
          preferredIntent: 'analyze_dependencies',
          loadingLabel: 'Analyzing dependencies…',
        },
      ];
    case 'task-detail':
      return [
        {
          id: 'breakdown',
          label: 'Break down task',
          message: 'Break this task into actionable subtasks with acceptance criteria and estimates.',
          preferredIntent: 'breakdown_task',
          loadingLabel: 'Breaking down task…',
        },
        {
          id: 'dependency-impact',
          label: 'Dependency impact',
          message: 'Analyze what happens if this task is delayed and identify downstream impact.',
          preferredIntent: 'analyze_dependencies',
          loadingLabel: 'Analyzing impact…',
        },
      ];
    case 'reports':
      return [
        {
          id: 'weekly-report',
          label: 'Weekly report',
          message: 'Generate a weekly status report for the organization.',
          preferredIntent: 'generate_report',
          loadingLabel: 'Generating report…',
        },
        {
          id: 'executive-report',
          label: 'Executive report',
          message: 'Generate an executive summary report with portfolio health and strategic risks.',
          preferredIntent: 'generate_report',
          loadingLabel: 'Generating report…',
        },
      ];
    case 'manage-users':
      return [
        {
          id: 'capacity',
          label: 'Team capacity',
          message: 'Analyze team capacity and utilization to identify bottlenecks and reallocation opportunities.',
          preferredIntent: 'plan_sprint',
          loadingLabel: 'Analyzing capacity…',
        },
      ];
    default:
      return [];
  }
}

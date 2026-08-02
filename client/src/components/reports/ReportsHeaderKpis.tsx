import React from 'react';
import { CheckCircle2, AlertTriangle, Clock, Zap, DollarSign, GitPullRequest } from 'lucide-react';
import StatCard, { StatCardColorTheme } from '../common/StatCard';

interface ReportSummary {
  totalTasks: number;
  totalProjects: number;
  totalGoals: number;
  totalMembers: number;
  tasksByStatus: {
    pending: number;
    inProgress: number;
    inReview: number;
    completed: number;
  };
  overdueTasks: number;
  completionRate: number;
}

interface ReportsHeaderKpisProps {
  summary: ReportSummary | null;
  trends: any;
  velocity: any;
  timeReport: any;
  deps: any;
  loading?: boolean;
}

export const ReportsHeaderKpis: React.FC<ReportsHeaderKpisProps> = ({
  summary,
  trends,
  velocity,
  timeReport,
  deps,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-18 bg-gray-100/60 dark:bg-slate-800/40 rounded-xl animate-pulse border border-gray-200/50 dark:border-slate-700/40"
          />
        ))}
      </div>
    );
  }

  const kpis: Array<{
    label: string;
    value: string | number;
    icon: any;
    colorTheme: StatCardColorTheme;
    progress?: number;
    subtext: string;
  }> = [
    {
      label: 'Completion Rate',
      value: summary ? `${summary.completionRate}%` : '—',
      icon: CheckCircle2,
      colorTheme: 'emerald',
      progress: summary?.completionRate ?? 0,
      subtext: `${summary?.tasksByStatus?.completed || 0} of ${summary?.totalTasks || 0} tasks done`,
    },
    {
      label: 'Overdue Tasks',
      value: summary?.overdueTasks ?? '—',
      icon: AlertTriangle,
      colorTheme: summary?.overdueTasks ? 'rose' : 'slate',
      subtext: summary?.overdueTasks ? 'Requires immediate action' : 'All tasks on schedule',
    },
    {
      label: 'Est. Days to Clear',
      value: trends?.productivity?.estimatedDaysToClear ?? '—',
      icon: Clock,
      colorTheme: 'sky',
      subtext: 'Based on 7-day velocity',
    },
    {
      label: 'Avg Velocity',
      value: velocity?.averageVelocityHours ? `${velocity.averageVelocityHours}h` : '—',
      icon: Zap,
      colorTheme: 'indigo',
      subtext: 'Per sprint iteration',
    },
    {
      label: 'Total Hours Logged',
      value: timeReport ? `${Math.round((timeReport.totalHours || 0) * 10) / 10}h` : '—',
      icon: DollarSign,
      colorTheme: 'amber',
      subtext: timeReport
        ? `${Math.round((timeReport.billableHours || 0) * 10) / 10}h billable`
        : 'No time logged yet',
    },
    {
      label: 'Critical Path / Blocked',
      value: deps ? `${deps.criticalPath?.length || 0} / ${deps.blockedTaskIds?.length || 0}` : '—',
      icon: GitPullRequest,
      colorTheme: deps?.blockedTaskIds?.length ? 'purple' : 'slate',
      subtext: deps?.cycles?.length ? `${deps.cycles.length} dependency cycles` : 'No circular deps',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {kpis.map((kpi, idx) => (
        <StatCard
          key={idx}
          title={kpi.label}
          value={kpi.value}
          icon={kpi.icon}
          colorTheme={kpi.colorTheme}
          progressBarValue={kpi.progress}
          subtext={kpi.subtext}
        />
      ))}
    </div>
  );
};

export default ReportsHeaderKpis;

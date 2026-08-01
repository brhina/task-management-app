import React from 'react';
import { CheckCircle2, AlertTriangle, Clock, Zap, DollarSign, GitPullRequest } from 'lucide-react';

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

  const kpis = [
    {
      label: 'Completion Rate',
      value: summary ? `${summary.completionRate}%` : '—',
      icon: CheckCircle2,
      progress: summary?.completionRate ?? 0,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgIcon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      barColor: 'bg-emerald-500',
      subtext: `${summary?.tasksByStatus?.completed || 0} of ${summary?.totalTasks || 0} tasks done`,
    },
    {
      label: 'Overdue Tasks',
      value: summary?.overdueTasks ?? '—',
      icon: AlertTriangle,
      color: summary?.overdueTasks ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300',
      bgIcon: summary?.overdueTasks
        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
        : 'bg-slate-500/10 text-slate-500',
      subtext: summary?.overdueTasks ? 'Requires immediate action' : 'All tasks on schedule',
    },
    {
      label: 'Est. Days to Clear',
      value: trends?.productivity?.estimatedDaysToClear ?? '—',
      icon: Clock,
      color: 'text-sky-600 dark:text-sky-400',
      bgIcon: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
      subtext: 'Based on 7-day velocity',
    },
    {
      label: 'Avg Velocity',
      value: velocity?.averageVelocityHours ? `${velocity.averageVelocityHours}h` : '—',
      icon: Zap,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgIcon: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      subtext: 'Per sprint iteration',
    },
    {
      label: 'Total Hours Logged',
      value: timeReport ? `${Math.round((timeReport.totalHours || 0) * 10) / 10}h` : '—',
      icon: DollarSign,
      color: 'text-amber-600 dark:text-amber-400',
      bgIcon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      subtext: timeReport
        ? `${Math.round((timeReport.billableHours || 0) * 10) / 10}h billable`
        : 'No time logged yet',
    },
    {
      label: 'Critical Path / Blocked',
      value: deps ? `${deps.criticalPath?.length || 0} / ${deps.blockedTaskIds?.length || 0}` : '—',
      icon: GitPullRequest,
      color: deps?.blockedTaskIds?.length ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300',
      bgIcon: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      subtext: deps?.cycles?.length ? `${deps.cycles.length} dependency cycles` : 'No circular deps',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {kpis.map((kpi, idx) => {
        const IconComponent = kpi.icon;
        return (
          <div
            key={idx}
            className="card p-2.5 sm:p-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                  {kpi.label}
                </span>
                <div className={`p-1 rounded-lg ${kpi.bgIcon}`}>
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className={`text-xl font-bold ${kpi.color} tabular-nums tracking-tight mb-0.5`}>
                {kpi.value}
              </div>
            </div>

            <div>
              {kpi.progress !== undefined && (
                <div className="w-full bg-gray-100 rounded-full h-1 my-1 overflow-hidden">
                  <div
                    className={`h-full ${kpi.barColor} rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(100, Math.max(0, kpi.progress))}%` }}
                  />
                </div>
              )}

              <div className="text-[10px] text-slate-500 truncate font-medium">
                {kpi.subtext}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ReportsHeaderKpis;

import React from 'react';
import { ShieldCheck, GitMerge, Clock, AlertCircle } from 'lucide-react';

interface ProjectHealth {
  projectId: string;
  name: string;
  completionRate: number;
  overdueTasks: number;
  health: 'healthy' | 'at_risk' | 'critical' | string;
  healthScore: number;
}

interface DependenciesData {
  criticalPath?: any[];
  blockedTaskIds?: string[];
  cycles?: any[];
  bottlenecks?: Array<{
    taskId: string;
    blockedDependents: number;
  }>;
}

interface TimeReportData {
  totalHours?: number;
  billableHours?: number;
  nonBillableHours?: number;
}

interface ProjectHealthAndDepsProps {
  projectHealth: ProjectHealth[];
  deps: DependenciesData | null;
  timeReport: TimeReportData | null;
  loading?: boolean;
}

export const ProjectHealthAndDeps: React.FC<ProjectHealthAndDepsProps> = ({
  projectHealth,
  deps,
  timeReport,
  loading = false,
}) => {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Project Health (1 col) */}
      <div className="card p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Project Health Risk Index
              </h3>
              <p className="text-xs text-slate-500">
                Risk calculation based on deadlines & overdue tasks
              </p>
            </div>
          </div>

          {projectHealth.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No projects monitored</div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {projectHealth.map((p) => {
                const isHealthy = p.health === 'healthy';
                const isAtRisk = p.health === 'at_risk';
                const statusBg = isHealthy
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isAtRisk
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200';

                return (
                  <div
                    key={p.projectId}
                    className="p-3 bg-gray-50 border border-gray-200/60 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800 truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{p.completionRate}% complete</span>
                        <span>•</span>
                        <span className={p.overdueTasks ? 'text-rose-500 font-semibold' : ''}>
                          {p.overdueTasks} overdue
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isHealthy ? 'bg-emerald-500' : isAtRisk ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, p.completionRate)}%` }}
                        />
                      </div>
                    </div>

                    <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold capitalize ${statusBg}`}>
                      Score: {p.healthScore}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dependency Analysis (1 col) */}
      <div className="card p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-1">
            <GitMerge className="w-5 h-5 text-primary" />
            Dependency Network Analysis
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Blockers, critical path length, and cycle warnings
          </p>

          {!deps ? (
            <div className="py-8 text-center text-xs text-slate-400">No dependency analysis data</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-primary tabular-nums">
                    {deps.criticalPath?.length || 0}
                  </div>
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Critical Path</div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-amber-700 tabular-nums">
                    {deps.blockedTaskIds?.length || 0}
                  </div>
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Blocked Tasks</div>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-rose-700 tabular-nums">
                    {deps.cycles?.length || 0}
                  </div>
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Cycles</div>
                </div>
              </div>

              {deps.bottlenecks && deps.bottlenecks.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    Top Bottleneck Tasks
                  </h4>
                  <div className="space-y-1.5">
                    {deps.bottlenecks.slice(0, 4).map((b) => (
                      <div
                        key={b.taskId}
                        className="flex items-center justify-between text-xs bg-gray-50 border border-gray-200/60 rounded-lg px-3 py-2"
                      >
                        <span className="font-mono text-slate-700 font-semibold">
                          Task #{String(b.taskId).slice(-6)}
                        </span>
                        <span className="text-slate-500 font-medium">
                          Blocks <strong className="text-rose-500">{b.blockedDependents}</strong> tasks
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Time Tracking Overview (1 col) */}
      <div className="card p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-amber-500" />
            Time Tracking & Billability
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Aggregated logged hours and billable distribution
          </p>

          {!timeReport ? (
            <div className="py-8 text-center text-xs text-slate-400">No time tracking data logged</div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-4">
                <div className="text-2xl font-bold text-slate-800 tabular-nums mb-1">
                  {Math.round((timeReport.totalHours || 0) * 10) / 10} hrs
                </div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Logged Time
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <div className="text-lg font-bold text-emerald-700 tabular-nums">
                    {Math.round((timeReport.billableHours || 0) * 10) / 10}h
                  </div>
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Billable</div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-lg font-bold text-slate-600 tabular-nums">
                    {Math.round((timeReport.nonBillableHours || 0) * 10) / 10}h
                  </div>
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Non-Billable</div>
                </div>
              </div>

              {timeReport.totalHours ? (
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-slate-500 font-semibold mb-1">
                    <span>Billable Ratio</span>
                    <span>
                      {Math.round(((timeReport.billableHours || 0) / timeReport.totalHours) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.round(
                          ((timeReport.billableHours || 0) / timeReport.totalHours) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectHealthAndDeps;

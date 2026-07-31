import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, AlertTriangle, Users, Lightbulb, RefreshCw, Target, TrendingUp,
  AlertCircle, CheckCircle2, ChevronRight, Check,
} from 'lucide-react';
import PageShell from '../../components/common/PageShell';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import { getPriorityColor, getStatusColor } from '../../constants/taskStatus';
import { isOverdue, getDaysUntilDue, getRelativeTime } from '../../utils/dateUtils';
import type { Task } from '../../types';

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function AdminWorkOS({ data, loading, error, runningDaily, onRunDaily, onDownload }: {
  data: any;
  loading: boolean;
  error: string;
  runningDaily: boolean;
  onRunDaily: () => void;
  onDownload: () => void;
}) {
  const { hasPermission } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState<'overview' | 'actions' | 'schedule' | 'insights'>('overview');

  const topTasks = useMemo(() => {
    const tasks = (data?.tasks || []) as any[];
    return tasks
      .filter((t: any) => t.status !== 'Completed')
      .sort((a: any, b: any) => (b?.priority?.score || 0) - (a?.priority?.score || 0))
      .slice(0, 10);
  }, [data]);

  const blockedTasks = useMemo(() => {
    return (data?.tasks || []).filter((t: any) => t.blocked).slice(0, 5);
  }, [data]);

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'actions' as const, label: 'Actions' },
    { id: 'schedule' as const, label: 'Schedule' },
    { id: 'insights' as const, label: 'Insights' },
  ];

  return (
    <>
      {/* Summary Banner */}
      <div className="card bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-700">
              {data?.summary || 'No summary available.'}
            </div>
            <div className="text-xs text-slate-500 mt-1">{data?.objective}</div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>{data?.estimated_effort?.hours ?? 0}h estimated</span>
            <span>Goal alignment: {data?.goal_alignment?.score ?? 0}%</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/50 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-200 text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Next Best Actions
            </h3>
            {(data?.next_best_actions || []).length === 0 ? (
              <div className="text-sm text-slate-500 py-4 text-center">No actions suggested.</div>
            ) : (
              <ul className="space-y-2">
                {data.next_best_actions.map((a: string, idx: number) => (
                  <li key={idx} className="flex gap-3 text-sm">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-slate-600">{a}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Risks & Mitigations
            </h3>
            <div className="space-y-3">
              {(data?.risk?.risks || []).length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold mb-1.5">
                    Risks
                  </div>
                  <ul className="space-y-1">
                    {(data?.risk?.risks || []).map((r: string, idx: number) => (
                      <li key={idx} className="text-sm text-slate-600 flex gap-2">
                        <span className="text-rose-400 mt-0.5">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(data?.risk?.mitigations || []).length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-1.5">
                    Mitigations
                  </div>
                  <ul className="space-y-1">
                    {(data?.risk?.mitigations || []).map((m: string, idx: number) => (
                      <li key={idx} className="text-sm text-slate-600 flex gap-2">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(data?.risk?.risks || []).length === 0 && (
                <div className="text-sm text-slate-500 py-2 text-center">No risks detected.</div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Workload
            </h3>
            <ul className="space-y-1.5">
              {(data?.workload?.recommendations || []).map((r: string, idx: number) => (
                <li key={idx} className="text-sm text-slate-600 flex gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-purple-400" />
              Recommendations
            </h3>
            <ul className="space-y-1.5">
              {(data?.recommendations || []).map((r: string, idx: number) => (
                <li key={idx} className="text-sm text-slate-600 flex gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="space-y-4">
          <div className="card !p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Top Priorities</h3>
              <span className="text-[10px] text-slate-500">Ranked by priority score</span>
            </div>
            {topTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No active tasks.</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {topTasks.map((t: any, idx: number) => (
                  <div key={t._id} className="px-4 py-3 hover:bg-gray-200/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/tasks/${t._id}`}
                            className="text-sm font-medium text-slate-700 hover:text-primary truncate"
                          >
                            {t.title}
                          </Link>
                          {t.blocked && (
                            <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 font-semibold">
                              BLOCKED
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span
                            className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getPriorityColor(t.status === 'Completed' ? 'Low' : t.risk?.score > 50 ? 'High' : t.risk?.score > 25 ? 'Medium' : 'Low')}`}
                          >
                            {t.status}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Score: {t.priority?.score ?? 0}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Impact: {t.impactScore ?? '—'}/10
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Effort: {t.effortHours ?? '—'}h
                          </span>
                          {t.assignedTo?.name && (
                            <span className="text-[10px] text-slate-500">
                              → {t.assignedTo.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {blockedTasks.length > 0 && (
            <div className="card !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-rose-400">
                  Blocked Tasks ({blockedTasks.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-700/50">
                {blockedTasks.map((t: any) => (
                  <div key={t._id} className="px-4 py-3">
                    <Link
                      to={`/tasks/${t._id}`}
                      className="text-sm font-medium text-slate-700 hover:text-primary"
                    >
                      {t.title}
                    </Link>
                    <div className="text-[10px] text-rose-400 mt-1">Blocked by dependencies</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="card !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-slate-700">Suggested Schedule</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Deep-work blocks for top priority tasks
            </p>
          </div>
          {(data?.suggested_schedule || []).length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No schedule suggestions.</div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {data.suggested_schedule.map((s: any, idx: number) => (
                <div key={idx} className="px-4 py-3 flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <Link
                      to={`/tasks/${s.taskId}`}
                      className="text-sm font-medium text-slate-700 hover:text-primary"
                    >
                      {topTasks.find((t: any) => t._id === s.taskId)?.title || s.taskId}
                    </Link>
                    <div className="text-xs text-slate-500 mt-1">{s.suggestion}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-cyan-400" />
              Active Automations
            </h3>
            <ul className="space-y-2">
              {(data?.automations || []).map((a: string, idx: number) => (
                <li key={idx} className="text-sm text-slate-600 flex gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  {a}
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              Goal Alignment
            </h3>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-3xl font-bold text-slate-700">
                {data?.goal_alignment?.score ?? 0}%
              </div>
              <div className="text-xs text-slate-500">Strategic alignment score</div>
            </div>
            {(data?.goal_alignment?.related_goals || []).length > 0 && (
              <div className="text-xs text-slate-500">
                {data.goal_alignment.related_goals.length} goals linked
              </div>
            )}
          </div>

          <div className="card lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Critical Path
            </h3>
            {(data?.critical_path || []).length === 0 ? (
              <div className="text-sm text-slate-500 py-2">No critical path detected.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.critical_path.map((taskId: string, idx: number) => {
                  const task = (data?.tasks || []).find((t: any) => t._id === taskId);
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <Link
                        to={`/tasks/${taskId}`}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-slate-600 hover:border-primary/50 hover:text-primary transition-colors"
                      >
                        {task?.title || taskId}
                      </Link>
                      {idx < data.critical_path.length - 1 && (
                        <span className="text-slate-600">→</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function UserWorkOSView({ tasks }: { tasks: Task[] }) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === 'Pending').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const inReview = tasks.filter((t) => t.status === 'In Review').length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const overdue = tasks.filter((t) => isOverdue(t.dueDate) && t.status !== 'Completed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, pending, inProgress, inReview, completed, overdue, completionRate };
  }, [tasks]);

  const urgentTasks = useMemo(() => {
    return tasks
      .filter(
        (t) =>
          t.status !== 'Completed' &&
          (isOverdue(t.dueDate) ||
            (getDaysUntilDue(t.dueDate) !== null && getDaysUntilDue(t.dueDate)! <= 2))
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [tasks]);

  const highPriorityTasks = useMemo(() => {
    return tasks
      .filter(
        (t) => t.status !== 'Completed' && (t.priority === 'High' || t.priority === 'Critical')
      )
      .slice(0, 5);
  }, [tasks]);

  const recentCompleted = useMemo(() => {
    return tasks
      .filter((t) => t.status === 'Completed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [tasks]);

  const weeklyProgress = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const completedThisWeek = tasks.filter(
      (t) => t.status === 'Completed' && new Date(t.updatedAt) >= weekAgo
    ).length;
    const totalActive = tasks.filter((t) => t.status !== 'Completed').length;
    return { completedThisWeek, totalActive };
  }, [tasks]);

  return (
    <>
      {/* Weekly Activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            This Week
          </div>
          <span className="text-xs text-slate-500">
            {weeklyProgress.completedThisWeek} tasks completed
          </span>
        </div>
        <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
            style={{ width: `${stats.completionRate}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-500">
          <span>{weeklyProgress.totalActive} active tasks remaining</span>
          <span className="font-bold text-slate-600">{stats.completionRate}% overall</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Urgent Tasks */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-rose-400 uppercase tracking-wide flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Urgent & Overdue ({urgentTasks.length})
              </div>
            </div>
            {urgentTasks.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                <div className="text-xs text-slate-500">No urgent tasks. Great job!</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {urgentTasks.map((t) => {
                  const daysLeft = getDaysUntilDue(t.dueDate);
                  const overdue = isOverdue(t.dueDate) && t.status !== 'Completed';
                  return (
                    <Link
                      key={t._id}
                      to={`/tasks/${t._id}`}
                      className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-gray-200/30 transition-colors group"
                    >
                      <div
                        className={`h-2 w-2 rounded-full shrink-0 ${overdue ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-700 group-hover:text-primary truncate transition-colors">
                          {t.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getStatusColor(t.status)}`}
                          >
                            {t.status}
                          </span>
                          <span
                            className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getPriorityColor(t.priority)}`}
                          >
                            {t.priority}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={`text-[10px] font-bold ${overdue ? 'text-rose-400' : 'text-amber-400'}`}
                        >
                          {overdue
                            ? `${Math.abs(daysLeft!)}d overdue`
                            : daysLeft === 0
                              ? 'Today'
                              : `${daysLeft}d left`}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* High Priority Tasks */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-amber-400 uppercase tracking-wide flex items-center gap-2">
                <Zap className="w-4 h-4" />
                High Priority ({highPriorityTasks.length})
              </div>
              <Link
                to="/tasks?priority=High"
                className="text-[10px] text-primary hover:text-primary-hover font-medium"
              >
                View all →
              </Link>
            </div>
            {highPriorityTasks.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-xs text-slate-500">No high priority tasks.</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {highPriorityTasks.map((t) => (
                  <Link
                    key={t._id}
                    to={`/tasks/${t._id}`}
                    className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-gray-200/30 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-700 group-hover:text-primary truncate transition-colors">
                        {t.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getStatusColor(t.status)}`}
                        >
                          {t.status}
                        </span>
                        <span
                          className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getPriorityColor(t.priority)}`}
                        >
                          {t.priority}
                        </span>
                        {t.dueDate && (
                          <span className="text-[10px] text-slate-500">
                            Due{' '}
                            {new Date(t.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-primary shrink-0 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Task Breakdown
            </div>
            <div className="space-y-2">
              {[
                { label: 'Pending', count: stats.pending, color: 'bg-yellow-500', textColor: 'text-yellow-400' },
                { label: 'In Progress', count: stats.inProgress, color: 'bg-blue-500', textColor: 'text-blue-400' },
                { label: 'In Review', count: stats.inReview, color: 'bg-purple-500', textColor: 'text-purple-400' },
                { label: 'Completed', count: stats.completed, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-xs text-slate-500">{item.label}</span>
                  </div>
                  <span className={`text-xs font-bold tabular-nums ${item.textColor}`}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                Recently Done
              </div>
              <Link
                to="/tasks?status=completed"
                className="text-[10px] text-primary hover:text-primary-hover font-medium"
              >
                View all →
              </Link>
            </div>
            {recentCompleted.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-4">
                No completed tasks yet.
              </div>
            ) : (
              <div className="space-y-2">
                {recentCompleted.map((t) => (
                  <Link
                    key={t._id}
                    to={`/tasks/${t._id}`}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-200/30 transition-colors group"
                  >
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-slate-600 group-hover:text-primary truncate transition-colors">
                        {t.title}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {getRelativeTime(t.updatedAt)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Insights
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Completion rate</span>
                <span className="text-xs font-bold text-slate-700">{stats.completionRate}%</span>
              </div>
              <div className="h-1 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Overdue tasks</span>
                <span
                  className={`text-xs font-bold ${stats.overdue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}
                >
                  {stats.overdue}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Avg. tasks/day</span>
                <span className="text-xs font-bold text-slate-700">
                  {stats.total > 0 ? Math.round(stats.total / 7) : 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function WorkOS() {
  const { user, canAccessAdminSuite, hasPermission } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [runningDaily, setRunningDaily] = useState(false);
  const isAdmin = canAccessAdminSuite();

  const orgId = user?.activeOrgId || localStorage.getItem('activeOrgId') || '';

  const fetchAdminData = async () => {
    try {
      const res = await api.get(apiPaths.WORKOS.ORG_SUMMARY.replace(':id', orgId || 'me'));
      setData(res.data?.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load WorkOS summary');
    }
  };

  const fetchUserData = async () => {
    try {
      const res = await api.get(apiPaths.TASKS.GET_USER_DASHBOARD_TASKS);
      setTasks(res.data?.recentTasks || []);
    } catch (err) {
      setError('Failed to load tasks');
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        if (isAdmin) {
          await fetchAdminData();
        } else {
          await fetchUserData();
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orgId, isAdmin]);

  const handleRunDaily = async () => {
    try {
      setRunningDaily(true);
      await api.post(apiPaths.AUTOMATION.DAILY_SUMMARY_JOB);
      await fetchAdminData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to run daily summary job');
    } finally {
      setRunningDaily(false);
    }
  };

  if (!user) {
    return <PageShell title="Please Log In" subtitle="You need to be logged in." />;
  }

  if (loading) {
    return (
      <PageShell title="WorkOS" subtitle={isAdmin ? 'Computing org data...' : 'Loading your data...'}>
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={isAdmin ? 'WorkOS' : 'My WorkOS'}
      subtitle={isAdmin ? 'Overview of priorities, risks, workload, and next-best-actions' : 'Your personal task overview and insights'}
      actions={
        <>
          {isAdmin ? (
            <>
              <button
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                type="button"
                onClick={handleRunDaily}
                disabled={runningDaily || !hasPermission('automation:manage')}
              >
                {runningDaily ? 'Running…' : 'Run summary'}
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                type="button"
                onClick={() => downloadJson('workos-summary.json', data)}
                disabled={!hasPermission('automation:manage')}
              >
                Download
              </button>
            </>
          ) : (
            <>
              <button
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
                onClick={fetchUserData}
              >
                Refresh
              </button>
              <Link
                to="/tasks"
                className="block px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
              >
                My Tasks
              </Link>
            </>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="alert-error">{error}</div>}
        {isAdmin ? (
          <AdminWorkOS
            data={data}
            loading={loading}
            error={error}
            runningDaily={runningDaily}
            onRunDaily={handleRunDaily}
            onDownload={() => downloadJson('workos-summary.json', data)}
          />
        ) : (
          <UserWorkOSView tasks={tasks} />
        )}
      </div>
    </PageShell>
  );
}

export default WorkOS;

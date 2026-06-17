import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageShell from '../../components/common/PageShell';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import { getStatusColor, getPriorityColor } from '../../constants/taskStatus';
import type { Goal, Project, Task } from '../../types';

const TIMEFRAME_COLORS: Record<string, string> = {
  Weekly: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  Monthly: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Quarterly: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  Yearly: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Custom: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

function GoalDetails() {
  const { user } = useContext(UserContext);
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [linkedProjects, setLinkedProjects] = useState<Project[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(apiPaths.GOALS.GET_BY_ID.replace(':id', id || ''));
        setGoal(res.data?.data?.goal || null);
        setLinkedProjects(res.data?.data?.linkedProjects || []);
        setLinkedTasks(res.data?.data?.linkedTasks || []);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load goal');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const taskStats = useMemo(() => {
    const total = linkedTasks.length;
    const completed = linkedTasks.filter(t => t.status === 'Completed').length;
    const inProgress = linkedTasks.filter(t => t.status === 'In Progress').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, progress };
  }, [linkedTasks]);

  const goalProgress = useMemo(() => {
    if (!goal?.targetValue) return null;
    return Math.min(100, Math.round(((goal.currentValue || 0) / goal.targetValue) * 100));
  }, [goal]);

  if (!user || user.role !== 'Admin') {
    return <PageShell title="Access Denied" subtitle="Admin only." />;
  }

  if (loading) {
    return (
      <PageShell title="Goal" subtitle="Loading...">
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </PageShell>
    );
  }

  if (error || !goal) {
    return <PageShell title="Goal" subtitle={error || 'Not found'} />;
  }

  return (
    <PageShell
      title={goal.title}
      subtitle={
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${TIMEFRAME_COLORS[goal.timeframe] || TIMEFRAME_COLORS.Custom}`}>
            {goal.timeframe}
          </span>
          {goal.objective && (
            <span className="text-slate-400 text-sm">{goal.objective}</span>
          )}
        </div>
      }
      actions={
        <div className="flex gap-2">
          <Link to="/admin/goals" className="btn-secondary">← Back</Link>
        </div>
      }
    >
      {error && <div className="alert-error mb-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Goal Progress */}
          {goalProgress !== null && (
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Progress</div>
                <span className="text-sm font-bold text-slate-200 tabular-nums">{goalProgress}%</span>
              </div>
              <div className="h-3 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                <span>{goal.currentValue ?? 0} current</span>
                <span>{goal.targetValue} target</span>
              </div>
            </div>
          )}

          {/* Linked Projects */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Linked Projects ({linkedProjects.length})
              </div>
            </div>
            {linkedProjects.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-10 h-10 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <div className="text-xs text-slate-500">No linked projects yet</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {linkedProjects.map(p => (
                  <Link
                    key={p._id}
                    to={`/admin/manage-tasks?projectId=${p._id}`}
                    className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-slate-700/30 transition-colors group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-200 group-hover:text-primary truncate transition-colors">{p.name}</div>
                      <div className="text-[10px] text-slate-500">{p.status}</div>
                    </div>
                    <svg className="w-4 h-4 text-slate-600 group-hover:text-primary shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Linked Tasks */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Linked Tasks ({linkedTasks.length})
              </div>
            </div>
            {linkedTasks.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-10 h-10 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <div className="text-xs text-slate-500">No linked tasks yet</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {linkedTasks.map(t => (
                  <Link
                    key={t._id}
                    to={`/user/task/${t._id}`}
                    className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-slate-700/30 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-200 group-hover:text-primary truncate transition-colors">{t.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getStatusColor(t.status)}`}>
                          {t.status}
                        </span>
                        <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getPriorityColor(t.priority)}`}>
                          {t.priority}
                        </span>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-slate-600 group-hover:text-primary shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Projects</div>
              <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{linkedProjects.length}</div>
            </div>
            <div className="card text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Tasks</div>
              <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{linkedTasks.length}</div>
            </div>
            <div className="card text-center">
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">Completed</div>
              <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{taskStats.completed}</div>
            </div>
            <div className="card text-center">
              <div className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">In Progress</div>
              <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{taskStats.inProgress}</div>
            </div>
          </div>

          {/* Task Completion */}
          {linkedTasks.length > 0 && (
            <div className="card">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Task Completion</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${taskStats.progress}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-300 tabular-nums">{taskStats.progress}%</span>
              </div>
            </div>
          )}

          {/* Goal Info */}
          <div className="card">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Goal Details</div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Timeframe</span>
                <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full border ${TIMEFRAME_COLORS[goal.timeframe] || TIMEFRAME_COLORS.Custom}`}>
                  {goal.timeframe}
                </span>
              </div>
              {goal.metric && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Metric</span>
                  <span className="text-xs text-slate-300">{goal.metric}</span>
                </div>
              )}
              {goal.targetValue != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Target</span>
                  <span className="text-xs font-bold text-slate-200">{goal.targetValue}</span>
                </div>
              )}
              {goal.currentValue != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Current</span>
                  <span className="text-xs text-slate-300">{goal.currentValue}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default GoalDetails;

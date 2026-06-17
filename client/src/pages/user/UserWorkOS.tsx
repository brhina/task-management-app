import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../../components/common/PageShell';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import { getStatusColor, getPriorityColor } from '../../constants/taskStatus';
import { isOverdue, getDaysUntilDue, getRelativeTime } from '../../utils/dateUtils';
import type { Task } from '../../types';

function ScoreRing({
  score,
  size = 48,
  stroke = 4,
}: {
  score: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-200">
        {score}
      </div>
    </div>
  );
}

function UserWorkOS() {
  const { user } = useContext(UserContext);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get(apiPaths.TASKS.GET_USER_DASHBOARD_TASKS);
      const allTasks = res.data?.recentTasks || [];
      setTasks(allTasks);
    } catch (err) {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

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

  const productivityScore = useMemo(() => {
    if (stats.total === 0) return 0;
    const weights = { completed: 3, inProgress: 2, inReview: 1, pending: 0 };
    const maxScore = stats.total * 3;
    const currentScore =
      stats.completed * weights.completed +
      stats.inProgress * weights.inProgress +
      stats.inReview * weights.inReview;
    return Math.round((currentScore / maxScore) * 100) || 0;
  }, [stats]);

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

  if (!user) {
    return <PageShell title="Please Log In" subtitle="You need to be logged in." />;
  }

  if (loading) {
    return (
      <PageShell title="My WorkOS" subtitle="Loading your productivity intelligence...">
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="My WorkOS"
      subtitle="Your personal productivity intelligence and task insights"
      actions={
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={fetchTasks}>
            Refresh
          </button>
          <Link to="/user/my-tasks" className="btn-primary">
            My Tasks
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <div className="alert-error">{error}</div>}

        {/* Productivity Score + KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card flex items-center gap-3">
            <ScoreRing score={productivityScore} />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Productivity
              </div>
              <div
                className={`text-sm font-bold ${productivityScore >= 70 ? 'text-emerald-400' : productivityScore >= 40 ? 'text-amber-400' : 'text-rose-400'}`}
              >
                {productivityScore >= 70
                  ? 'Strong'
                  : productivityScore >= 40
                    ? 'Moderate'
                    : 'Needs Focus'}
              </div>
            </div>
          </div>
          <div className="card text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Total
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{stats.total}</div>
            <div className="text-[10px] text-slate-500">tasks assigned</div>
          </div>
          <div className="card text-center">
            <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
              Completed
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">
              {stats.completed}
            </div>
            <div className="text-[10px] text-slate-500">{stats.completionRate}% rate</div>
          </div>
          <div className="card text-center">
            <div className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold">
              Overdue
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">
              {stats.overdue}
            </div>
            <div className="text-[10px] text-slate-500">need attention</div>
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              This Week
            </div>
            <span className="text-xs text-slate-500">
              {weeklyProgress.completedThisWeek} tasks completed
            </span>
          </div>
          <div className="h-3 rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-slate-500">
            <span>{weeklyProgress.totalActive} active tasks remaining</span>
            <span className="font-bold text-slate-300">{stats.completionRate}% overall</span>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Urgent & High Priority */}
          <div className="lg:col-span-2 space-y-4">
            {/* Urgent Tasks */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-rose-400 uppercase tracking-wide flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Urgent & Overdue ({urgentTasks.length})
                </div>
              </div>
              {urgentTasks.length === 0 ? (
                <div className="text-center py-6">
                  <svg
                    className="w-8 h-8 text-emerald-500/50 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
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
                        to={`/user/task/${t._id}`}
                        className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-slate-700/30 transition-colors group"
                      >
                        <div
                          className={`h-2 w-2 rounded-full shrink-0 ${overdue ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-200 group-hover:text-primary truncate transition-colors">
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  High Priority ({highPriorityTasks.length})
                </div>
                <Link
                  to="/user/my-tasks?priority=High"
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
                      to={`/user/task/${t._id}`}
                      className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-slate-700/30 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-200 group-hover:text-primary truncate transition-colors">
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
                      <svg
                        className="w-4 h-4 text-slate-600 group-hover:text-primary shrink-0 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4">
            {/* Task Breakdown */}
            <div className="card">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Task Breakdown
              </div>
              <div className="space-y-2">
                {[
                  {
                    label: 'Pending',
                    count: stats.pending,
                    color: 'bg-yellow-500',
                    textColor: 'text-yellow-400',
                  },
                  {
                    label: 'In Progress',
                    count: stats.inProgress,
                    color: 'bg-blue-500',
                    textColor: 'text-blue-400',
                  },
                  {
                    label: 'In Review',
                    count: stats.inReview,
                    color: 'bg-purple-500',
                    textColor: 'text-purple-400',
                  },
                  {
                    label: 'Completed',
                    count: stats.completed,
                    color: 'bg-emerald-500',
                    textColor: 'text-emerald-400',
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-xs text-slate-400">{item.label}</span>
                    </div>
                    <span className={`text-xs font-bold tabular-nums ${item.textColor}`}>
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recently Completed */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                  Recently Done
                </div>
                <Link
                  to="/user/my-tasks?status=completed"
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
                      to={`/user/task/${t._id}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/30 transition-colors group"
                    >
                      <svg
                        className="w-4 h-4 text-emerald-500 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-300 group-hover:text-primary truncate transition-colors">
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

            {/* Quick Stats */}
            <div className="card">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Insights
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Completion rate</span>
                  <span className="text-xs font-bold text-slate-200">{stats.completionRate}%</span>
                </div>
                <div className="h-1 rounded-full bg-slate-700 overflow-hidden">
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
                  <span className="text-xs font-bold text-slate-200">
                    {stats.total > 0 ? Math.round(stats.total / 7) : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default UserWorkOS;

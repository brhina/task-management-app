import { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import PageShell from '../../components/common/PageShell';
import StatusChart from '../../components/insights/StatusChart';
import PriorityChart from '../../components/insights/PriorityChart';
import { getStatusColor, getPriorityColor } from '../../constants/taskStatus';
import { isOverdue, getDaysUntilDue, getRelativeTime } from '../../utils/dateUtils';
import type { DashboardData } from '../../types';

function Dashboard() {
  const { user, getEffectiveRole } = useContext(UserContext);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get(apiPaths.TASKS.GET_DASHBOARD_TASKS);
      setDashboardData(response.data);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (!dashboardData)
      return { total: 0, pending: 0, inProgress: 0, inReview: 0, completed: 0, overdue: 0 };
    const total = dashboardData.statistics?.allTasks ?? 0;
    const pending = dashboardData.statistics?.pendingTasks ?? 0;
    const inProgress = dashboardData.statistics?.inProgressTasks ?? 0;
    const inReview = dashboardData.statistics?.inReviewTasks ?? 0;
    const completed = dashboardData.statistics?.completedTasks ?? 0;
    const overdue = dashboardData.statistics?.overdueTasks ?? 0;
    return { total, pending, inProgress, inReview, completed, overdue };
  }, [dashboardData]);

  const urgentTasks = useMemo(() => {
    if (!dashboardData?.recentTasks) return [];
    return dashboardData.recentTasks
      .filter(
        (t) =>
          t.status !== 'Completed' &&
          (isOverdue(t.dueDate) ||
            (getDaysUntilDue(t.dueDate) !== null && getDaysUntilDue(t.dueDate)! <= 2))
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [dashboardData]);

  const effectiveRole = getEffectiveRole();
  if (!user || effectiveRole !== 'OrgAdmin') {
    return (
      <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />
    );
  }

  if (loading) {
    return (
      <PageShell title="Dashboard" subtitle="Loading...">
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return <PageShell title="Error" subtitle={error} />;
  }

  return (
    <PageShell
      title="Dashboard"
      subtitle="Here's an overview of your task management system"
      actions={
        <div className="flex gap-2">
          <Link to="/admin/workos" className="btn-secondary">
            WorkOS
          </Link>
          <Link to="/admin/create-task" className="btn-primary">
            Create Task
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <div className="alert-error">{error}</div>}

        {/* KPI Cards */}
        {/* <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    <div className="card text-center">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total Tasks</div>
                        <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{stats.total}</div>
                        <div className="text-[10px] text-slate-500">across all projects</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-[10px] uppercase tracking-wider text-yellow-400 font-semibold">Pending</div>
                        <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{stats.pending}</div>
                        <div className="text-[10px] text-slate-500">awaiting start</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">In Progress</div>
                        <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{stats.inProgress}</div>
                        <div className="text-[10px] text-slate-500">actively working</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">Completed</div>
                        <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{stats.completed}</div>
                        <div className="text-[10px] text-slate-500">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% rate</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold">Overdue</div>
                        <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{stats.overdue}</div>
                        <div className="text-[10px] text-slate-500">need attention</div>
                    </div>
                </div>

                {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Status Distribution
            </div>
            <StatusChart
              distribution={{
                pending: dashboardData?.charts?.taskDistribution?.pending ?? 0,
                in_progress: dashboardData?.charts?.taskDistribution?.in_progress ?? 0,
                in_review: dashboardData?.charts?.taskDistribution?.in_review ?? 0,
                completed: dashboardData?.charts?.taskDistribution?.completed ?? 0,
                all: dashboardData?.charts?.taskDistribution?.all ?? 0,
              }}
            />
          </div>
          <div className="card">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Priority Distribution
            </div>
            <PriorityChart distribution={dashboardData?.charts?.taskPriorityLevels} />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Urgent Tasks */}
          <div className="lg:col-span-2 card">
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
                Needs Attention ({urgentTasks.length})
              </div>
              <Link
                to="/admin/manage-tasks"
                className="text-[10px] text-primary hover:text-primary-hover font-medium"
              >
                View all →
              </Link>
            </div>
            {urgentTasks.length === 0 ? (
              <div className="text-center py-8">
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
                <div className="text-xs text-slate-500">No urgent tasks. All on track!</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {urgentTasks.map((t) => {
                  const daysLeft = getDaysUntilDue(t.dueDate);
                  const overdue = isOverdue(t.dueDate) && t.status !== 'Completed';
                  return (
                    <Link
                      key={t._id}
                      to={`/admin/task/${t._id}`}
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

          {/* Quick Actions */}
          <div className="card">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Quick Actions
            </div>
            <div className="space-y-2">
              <Link
                to="/admin/create-task"
                className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-700 hover:border-primary/40 hover:bg-slate-700/30 transition-all group"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-200 group-hover:text-primary transition-colors">
                    Create Task
                  </div>
                  <div className="text-[10px] text-slate-500">Assign to team members</div>
                </div>
              </Link>
              <Link
                to="/admin/manage-tasks"
                className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-700 hover:border-blue-400/40 hover:bg-slate-700/30 transition-all group"
              >
                <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-200 group-hover:text-primary transition-colors">
                    Manage Tasks
                  </div>
                  <div className="text-[10px] text-slate-500">View and update all tasks</div>
                </div>
              </Link>
              <Link
                to="/admin/projects"
                className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-700 hover:border-violet-400/40 hover:bg-slate-700/30 transition-all group"
              >
                <div className="h-8 w-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-violet-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7h6l2 2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-200 group-hover:text-primary transition-colors">
                    Projects
                  </div>
                  <div className="text-[10px] text-slate-500">Manage project outcomes</div>
                </div>
              </Link>
              <Link
                to="/admin/manage-users"
                className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-700 hover:border-emerald-400/40 hover:bg-slate-700/30 transition-all group"
              >
                <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-200 group-hover:text-primary transition-colors">
                    Team
                  </div>
                  <div className="text-[10px] text-slate-500">Manage team members</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Recent Tasks
            </div>
            <Link
              to="/admin/manage-tasks"
              className="text-[10px] text-primary hover:text-primary-hover font-medium"
            >
              View all →
            </Link>
          </div>
          {dashboardData?.recentTasks?.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-10 h-10 text-slate-600 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <div className="text-xs text-slate-500">No tasks yet. Create your first task!</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {dashboardData?.recentTasks?.slice(0, 8).map((task) => {
                const overdue = isOverdue(task.dueDate) && task.status !== 'Completed';
                const daysLeft = getDaysUntilDue(task.dueDate);
                return (
                  <Link
                    key={task._id}
                    to={`/admin/task/${task._id}`}
                    className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-slate-700/30 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-200 group-hover:text-primary truncate transition-colors">
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getStatusColor(task.status)}`}
                        >
                          {task.status}
                        </span>
                        <span
                          className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getPriorityColor(task.priority)}`}
                        >
                          {task.priority}
                        </span>
                        {task.dueDate && (
                          <span
                            className={`text-[10px] ${overdue ? 'text-rose-400 font-medium' : 'text-slate-500'}`}
                          >
                            {overdue
                              ? `${Math.abs(daysLeft!)}d overdue`
                              : daysLeft === 0
                                ? 'Today'
                                : `${daysLeft}d left`}
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

export default Dashboard;

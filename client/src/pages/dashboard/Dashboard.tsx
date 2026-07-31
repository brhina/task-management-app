import { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, AlertCircle, CheckCircle, ClipboardList, ChevronRight } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import PageShell from '../../components/common/PageShell';
import StatusChart from '../../components/insights/StatusChart';
import PriorityChart from '../../components/insights/PriorityChart';
import CreateTask from '../tasks/CreateTask';
import { getStatusColor, getPriorityColor } from '../../constants/taskStatus';
import { isOverdue, getDaysUntilDue, getRelativeTime } from '../../utils/dateUtils';
import type { DashboardData } from '../../types';

function Dashboard() {
  const { user, canAccessAdminSuite } = useContext(UserContext);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const isAdmin = canAccessAdminSuite();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const endpoint = isAdmin
        ? apiPaths.TASKS.GET_DASHBOARD_TASKS
        : apiPaths.TASKS.GET_USER_DASHBOARD_TASKS;
      const response = await api.get(endpoint);
      setDashboardData(response.data);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

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
      .slice(0, isAdmin ? 5 : 3);
  }, [dashboardData, isAdmin]);

  const stats = useMemo(() => {
    if (!dashboardData)
      return { pending: 0, inProgress: 0, inReview: 0, completed: 0 };
    return {
      pending: dashboardData.statistics?.pendingTasks ?? 0,
      inProgress: dashboardData.statistics?.inProgressTasks ?? 0,
      inReview: dashboardData.statistics?.inReviewTasks ?? 0,
      completed: dashboardData.statistics?.completedTasks ?? 0,
    };
  }, [dashboardData]);

  if (!user) {
    return <PageShell title="Please Log In" subtitle="You need to be logged in." />;
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
      subtitle={isAdmin ? "Here's an overview of your task management system" : "Here's an overview of your tasks and progress"}
      actions={
        <>
          <Link
            to="/settings/workos"
            className="block px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
          >
            {isAdmin ? 'WorkOS' : 'My WorkOS'}
          </Link>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowCreateTask(true)}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
            >
              Create Task
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="alert-error">{error}</div>}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
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
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Priority Distribution
            </div>
            <PriorityChart distribution={dashboardData?.charts?.taskPriorityLevels} />
          </div>
        </div>

        {/* Urgent Tasks */}
        {urgentTasks.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-rose-400 uppercase tracking-wide flex items-center gap-2">
                {isAdmin ? <AlertTriangle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                Needs Attention ({urgentTasks.length})
              </div>
              <Link
                to="/tasks"
                className="text-[10px] text-primary hover:text-primary-hover font-medium"
              >
                View all →
              </Link>
            </div>
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
          </div>
        )}

        {/* Main Content Grid */}
        <div className={`grid grid-cols-1 ${isAdmin ? '' : 'lg:grid-cols-3'} gap-4`}>
          {/* Recent Tasks */}
          <div className={`${isAdmin ? '' : 'lg:col-span-2'} card`}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Recent Tasks
              </div>
              <Link
                to="/tasks"
                className="text-[10px] text-primary hover:text-primary-hover font-medium"
              >
                View all →
              </Link>
            </div>
            {dashboardData?.recentTasks?.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <div className="text-xs text-slate-500">
                  {isAdmin ? 'No tasks yet. Create your first task!' : 'No tasks yet. Check back later!'}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {dashboardData?.recentTasks?.slice(0, isAdmin ? 8 : 5).map((task) => {
                  const overdue = isOverdue(task.dueDate) && task.status !== 'Completed';
                  const daysLeft = getDaysUntilDue(task.dueDate);
                  return (
                    <Link
                      key={task._id}
                      to={`/tasks/${task._id}`}
                      className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-gray-200/30 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-700 group-hover:text-primary truncate transition-colors">
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
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-primary shrink-0 transition-colors" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* User sidebar - status summary (non-admin only) */}
          {!isAdmin && (
            <div className="space-y-4">
              <div className="card">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Task Status
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Pending', count: stats.pending, color: 'bg-yellow-500' },
                    { label: 'In Progress', count: stats.inProgress, color: 'bg-blue-500' },
                    { label: 'In Review', count: stats.inReview, color: 'bg-purple-500' },
                    { label: 'Completed', count: stats.completed, color: 'bg-emerald-500' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${item.color}`} />
                        <span className="text-xs text-slate-500">{item.label}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-600 tabular-nums">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {isAdmin && (
        <CreateTask
          isOpen={showCreateTask}
          onClose={() => setShowCreateTask(false)}
          onCreated={fetchDashboardData}
        />
      )}
    </PageShell>
  );
}

export default Dashboard;

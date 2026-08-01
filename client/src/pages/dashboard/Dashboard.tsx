import { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  ClipboardList,
  ChevronRight,
  Plus,
  Search,
  Clock,
  BarChart3,
  Kanban,
  Sparkles,
  Briefcase,
  Target,
  CheckCircle2,
  CheckCircle,
  ListFilter,
  RefreshCw,
  Zap,
  Layers,
  Activity,
} from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import PageShell from '../../components/common/PageShell';
import StatusChart from '../../components/insights/StatusChart';
import PriorityChart from '../../components/insights/PriorityChart';
import CreateTask from '../tasks/CreateTask';
import { getStatusColor, getPriorityColor } from '../../constants/taskStatus';
import { isOverdue, getDaysUntilDue } from '../../utils/dateUtils';
import type { DashboardData, Task, TaskStatus } from '../../types';

function Dashboard() {
  const { user, canAccessAdminSuite, getEffectiveRole } = useContext(UserContext);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // Layout & Filter states
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'urgent' | 'completed'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [chartView, setChartView] = useState<'status' | 'priority'>('status');

  const isAdmin = canAccessAdminSuite();
  const userRole = getEffectiveRole() || user?.role || 'Member';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const endpoint = isAdmin
        ? apiPaths.TASKS.GET_DASHBOARD_TASKS
        : apiPaths.TASKS.GET_USER_DASHBOARD_TASKS;
      const response = await api.get(endpoint);
      setDashboardData(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      setUpdatingTaskId(taskId);
      const endpoint = apiPaths.TASKS.UPDATE_TASK_STATUS.replace(':id', taskId);
      await api.put(endpoint, { status: newStatus });
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to update task status:', err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const stats = useMemo(() => {
    if (!dashboardData) {
      return { all: 0, pending: 0, inProgress: 0, inReview: 0, completed: 0, overdue: 0 };
    }
    const s = dashboardData.statistics || {};
    return {
      all: s.allTasks ?? 0,
      pending: s.pendingTasks ?? 0,
      inProgress: dashboardData.charts?.taskDistribution?.in_progress ?? 0,
      inReview: dashboardData.charts?.taskDistribution?.in_review ?? 0,
      completed: s.completedTasks ?? 0,
      overdue: s.overdueTasks ?? 0,
    };
  }, [dashboardData]);

  const completionRate = useMemo(() => {
    if (!stats.all || stats.all === 0) return 0;
    return Math.round((stats.completed / stats.all) * 100);
  }, [stats]);

  const urgentTasks = useMemo(() => {
    const list = dashboardData?.recentTasks || [];
    return list
      .filter(
        (t) =>
          t.status !== 'Completed' &&
          (isOverdue(t.dueDate) ||
            (getDaysUntilDue(t.dueDate) !== null && getDaysUntilDue(t.dueDate)! <= 2))
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [dashboardData]);

  const filteredTasks = useMemo(() => {
    let list: Task[] = [];
    if (activeTab === 'urgent') {
      list = urgentTasks;
    } else if (activeTab === 'completed') {
      list = dashboardData?.recentCompletedTasks || [];
    } else if (activeTab === 'active') {
      list = (dashboardData?.recentTasks || []).filter((t) => t.status !== 'Completed');
    } else {
      const combined = [
        ...(dashboardData?.recentTasks || []),
        ...(dashboardData?.recentCompletedTasks || []),
      ];
      const map = new Map<string, Task>();
      combined.forEach((t) => map.set(t._id, t));
      list = Array.from(map.values());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q));
    }

    if (priorityFilter !== 'all') {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    return list;
  }, [dashboardData, activeTab, searchQuery, priorityFilter, urgentTasks]);

  if (!user) {
    return <PageShell title="Please Log In" subtitle="You need to be logged in." />;
  }

  if (loading && !dashboardData) {
    return (
      <PageShell title="Dashboard" subtitle="Loading your WorkOS task workspace...">
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-primary"></div>
          <p className="text-sm text-slate-500 font-medium">Computing WorkOS metrics...</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={
        <div className="flex items-center gap-3">
          <span>
            {getTimeGreeting()}, {user.name.split(' ')[0]}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/30">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {userRole}
          </span>
        </div>
      }
      subtitle={
        isAdmin
          ? 'WorkOS executive control center for task throughput, risk mitigation, and velocity.'
          : 'Track your assigned work, upcoming deadlines, and task execution.'
      }
      actions={
        <>
          <button
            type="button"
            onClick={() => setShowCreateTask(true)}
            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-4 h-4 text-primary" />
            Create Task
          </button>
          <Link
            to="/tasks"
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
          >
            <Kanban className="w-4 h-4 text-slate-500" />
            Kanban Board
          </Link>
          <Link
            to="/reports"
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-slate-500" />
            Reports & Analytics
          </Link>
          <Link
            to="/settings/workos"
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
          >
            <Briefcase className="w-4 h-4 text-slate-500" />
            WorkOS Control Center
          </Link>
        </>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="alert-error flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchDashboardData} className="underline font-bold ml-2">
              Retry
            </button>
          </div>
        )}

        {/* WorkOS Hero Health Gauge Style Banner */}
        <div className="card bg-gradient-to-r from-primary/10 via-white to-sky-50/50 border border-primary/20 text-slate-800 p-5 shadow-card relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-primary/20 blur-3xl opacity-30 pointer-events-none" />
          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-primary" />
                WorkOS Workspace Intelligence
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800">
                {stats.completed} of {stats.all} tasks completed ({completionRate}%)
              </h2>
              <p className="text-xs text-slate-500">
                Real-time throughput, active priorities, and team execution health.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowCreateTask(true)}
                className="btn btn-primary text-xs px-4 py-2 flex items-center gap-1.5 font-bold shadow-md hover:bg-primary-hover transition-all"
              >
                <Plus className="w-4 h-4" />
                New Task
              </button>
              <Link
                to="/tasks"
                className="px-3.5 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <Kanban className="w-4 h-4 text-primary" />
                Board View
              </Link>
            </div>
          </div>
        </div>

        {/* WorkOS Style Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="card bg-white border border-slate-200/90 p-4 shadow-sm hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Total Tasks
              </span>
              <div className="p-1.5 rounded-xl bg-slate-100 text-slate-600">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-800 tabular-nums">{stats.all}</div>
            <div className="text-[10px] text-slate-400 mt-1 font-medium">Workspace total</div>
          </div>

          <div className="card bg-white border border-slate-200/90 p-4 shadow-sm hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-sky-600">
                In Progress
              </span>
              <div className="p-1.5 rounded-xl bg-sky-500/10 text-sky-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-sky-600 tabular-nums">{stats.inProgress}</div>
            <div className="text-[10px] text-slate-400 mt-1 font-medium">Active developments</div>
          </div>

          <div className="card bg-white border border-slate-200/90 p-4 shadow-sm hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600">
                Pending & Review
              </span>
              <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 tabular-nums">
              {stats.pending + stats.inReview}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-medium">Queue & approvals</div>
          </div>

          <div className="card bg-white border border-slate-200/90 p-4 shadow-sm hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">
                Completed
              </span>
              <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 tabular-nums">
              {stats.completed}
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(completionRate, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-medium">
              {completionRate}% completion rate
            </div>
          </div>

          <div className="card bg-white border border-slate-200/90 p-4 shadow-sm hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`text-[10px] uppercase font-bold tracking-wider ${
                  urgentTasks.length > 0 ? 'text-rose-600' : 'text-slate-500'
                }`}
              >
                Needs Attention
              </span>
              <div
                className={`p-1.5 rounded-xl ${
                  urgentTasks.length > 0
                    ? 'bg-rose-500/10 text-rose-600'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-2xl font-black tabular-nums ${
                urgentTasks.length > 0 ? 'text-rose-600' : 'text-slate-800'
              }`}
            >
              {urgentTasks.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-medium">
              {urgentTasks.length > 0 ? 'Overdue or due soon' : 'All clear!'}
            </div>
          </div>
        </div>

        {/* Dual Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Task Hub (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="card bg-white border border-slate-200 p-5">
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200/80">
                <div className="flex items-center gap-2 shrink-0">
                  <ListFilter className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-bold text-slate-800">Task Work Hub</h2>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-primary/10 text-primary border border-primary/20">
                    {filteredTasks.length}
                  </span>
                </div>

                {/* Filter Controls - Clean Separated Flex Layout */}
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-52 sm:flex-initial">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-colors shrink-0 shadow-sm"
                  >
                    <option value="all">All Priorities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {/* WorkOS Style Navigation Tabs (Horizontally Scrollable on Mobile) */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 mb-4 text-xs font-bold overflow-x-auto max-w-full flex-nowrap no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab('active')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 whitespace-nowrap ${
                    activeTab === 'active'
                      ? 'bg-white text-primary shadow-sm font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Active Tasks ({stats.inProgress + stats.pending + stats.inReview})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('urgent')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                    activeTab === 'urgent'
                      ? 'bg-rose-500/10 text-rose-600 border border-rose-500/30 font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  Needs Attention ({urgentTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('completed')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 whitespace-nowrap ${
                    activeTab === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Recently Completed
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 whitespace-nowrap ${
                    activeTab === 'all'
                      ? 'bg-white text-slate-800 shadow-sm font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All Tasks
                </button>
              </div>

              {/* Task List */}
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <div className="text-sm font-bold text-slate-700">No tasks found</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {searchQuery
                      ? 'Try adjusting your search query or filters.'
                      : 'You are all caught up! Create a new task to get started.'}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredTasks.map((task) => {
                    const daysLeft = getDaysUntilDue(task.dueDate);
                    const overdue = isOverdue(task.dueDate) && task.status !== 'Completed';
                    const isUpdating = updatingTaskId === task._id;

                    return (
                      <div
                        key={task._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors group"
                      >
                        {/* Task info & Checkbox toggle */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            title={
                              task.status === 'Completed'
                                ? 'Mark as Pending'
                                : 'Mark as Completed'
                            }
                            disabled={isUpdating}
                            onClick={() =>
                              handleStatusChange(
                                task._id,
                                task.status === 'Completed' ? 'Pending' : 'Completed'
                              )
                            }
                            className={`mt-0.5 rounded-full p-0.5 border transition-all ${
                              task.status === 'Completed'
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-300 hover:border-primary text-transparent'
                            }`}
                          >
                            {isUpdating ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5 fill-current" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <Link
                              to={`/tasks/${task._id}`}
                              className={`text-sm font-bold hover:text-primary transition-colors block truncate ${
                                task.status === 'Completed'
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-800'
                              }`}
                            >
                              {task.title}
                            </Link>

                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span
                                className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded border ${getPriorityColor(
                                  task.priority
                                )}`}
                              >
                                {task.priority}
                              </span>

                              {task.dueDate && (
                                <span
                                  className={`text-[10px] font-semibold flex items-center gap-1 ${
                                    overdue
                                      ? 'text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200'
                                      : daysLeft === 0
                                      ? 'text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  <Clock className="w-3 h-3" />
                                  {overdue
                                    ? `${Math.abs(daysLeft!)}d overdue`
                                    : daysLeft === 0
                                    ? 'Due Today'
                                    : `${daysLeft}d left`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Inline Status Dropdown & View link */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <select
                            disabled={isUpdating}
                            value={task.status}
                            onChange={(e) =>
                              handleStatusChange(task._id, e.target.value as TaskStatus)
                            }
                            className={`text-[11px] font-bold py-1 px-2.5 rounded-lg border focus:outline-none transition-all cursor-pointer ${getStatusColor(
                              task.status
                            )}`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="In Review">In Review</option>
                            <option value="Completed">Completed</option>
                          </select>

                          <Link
                            to={`/tasks/${task._id}`}
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar (4 Cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Visual Analytics Card */}
            <div className="card bg-white border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/80">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-primary" />
                  Analytics & Distribution
                </div>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setChartView('status')}
                    className={`px-2 py-0.5 rounded-md transition-colors ${
                      chartView === 'status'
                        ? 'bg-white text-slate-800 shadow-sm font-black'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('priority')}
                    className={`px-2 py-0.5 rounded-md transition-colors ${
                      chartView === 'priority'
                        ? 'bg-white text-slate-800 shadow-sm font-black'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Priority
                  </button>
                </div>
              </div>

              {chartView === 'status' ? (
                <StatusChart
                  distribution={{
                    pending: dashboardData?.charts?.taskDistribution?.pending ?? 0,
                    in_progress: dashboardData?.charts?.taskDistribution?.in_progress ?? 0,
                    in_review: dashboardData?.charts?.taskDistribution?.in_review ?? 0,
                    completed: dashboardData?.charts?.taskDistribution?.completed ?? 0,
                    all: dashboardData?.charts?.taskDistribution?.all ?? 0,
                  }}
                />
              ) : (
                <PriorityChart distribution={dashboardData?.charts?.taskPriorityLevels} />
              )}
            </div>

            {/* Light WorkOS Execution & Throughput Card */}
            <div className="card bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Execution Throughput
                </div>
                <span className="text-xs font-black text-emerald-600">{completionRate}%</span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4 overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="bg-gradient-to-r from-primary via-sky-400 to-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-100">
                <div>
                  <div className="text-slate-500 text-[10px] uppercase font-bold">
                    Active Tasks
                  </div>
                  <div className="text-base font-black text-slate-800">
                    {stats.inProgress + stats.pending}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] uppercase font-bold">
                    Urgent & Risks
                  </div>
                  <div
                    className={`text-base font-black ${
                      urgentTasks.length > 0 ? 'text-rose-600' : 'text-slate-800'
                    }`}
                  >
                    {urgentTasks.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Workspace Launchpad */}
            <div className="card bg-white border border-slate-200 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-primary" />
                WorkOS Workspace Launchpad
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  to="/tasks"
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all text-xs font-bold text-slate-700 group"
                >
                  <Kanban className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                  <span>Kanban Board</span>
                </Link>
                <Link
                  to="/projects"
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-indigo-500/40 hover:bg-indigo-50 transition-all text-xs font-bold text-slate-700 group"
                >
                  <Briefcase className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span>Projects</span>
                </Link>
                <Link
                  to="/goals"
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500/40 hover:bg-emerald-50 transition-all text-xs font-bold text-slate-700 group"
                >
                  <Target className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span>Goals & OKRs</span>
                </Link>
                <Link
                  to="/reports"
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-amber-500/40 hover:bg-amber-50 transition-all text-xs font-bold text-slate-700 group"
                >
                  <BarChart3 className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                  <span>Reports</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateTask
        isOpen={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        onCreated={fetchDashboardData}
      />
    </PageShell>
  );
}

export default Dashboard;

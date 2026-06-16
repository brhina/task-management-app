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

function UserDashboard() {
    const { user } = useContext(UserContext);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await api.get(apiPaths.TASKS.GET_USER_DASHBOARD_TASKS);
            setDashboardData(response.data);
        } catch (err) {
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        if (!dashboardData) return { total: 0, pending: 0, inProgress: 0, inReview: 0, completed: 0, overdue: 0 };
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
            .filter(t => t.status !== 'Completed' && (isOverdue(t.dueDate) || (getDaysUntilDue(t.dueDate) !== null && getDaysUntilDue(t.dueDate)! <= 2)))
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 3);
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

    return (
        <PageShell
            title={`Welcome back, ${user.name}!`}
            subtitle="Here's an overview of your tasks and progress"
            actions={
                <div className="flex gap-2">
                    <Link to="/user/workos" className="btn-secondary">My WorkOS</Link>
                </div>
            }
        >
            <div className="space-y-4">
                {error && <div className="alert-error">{error}</div>}

                {/* KPI Cards */}
                {/* <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="card text-center">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total</div>
                        <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{stats.total}</div>
                        <div className="text-[10px] text-slate-500">tasks assigned</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">In Progress</div>
                        <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{stats.inProgress}</div>
                        <div className="text-[10px] text-slate-500">active tasks</div>
                    </div>
                    <div className="card text-center">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">Completed</div>
                        <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">{stats.completed}</div>
                        <div className="text-[10px] text-slate-500">tasks done</div>
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
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Status Distribution</div>
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
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Priority Distribution</div>
                        <PriorityChart distribution={dashboardData?.charts?.taskPriorityLevels} />
                    </div>
                </div>

                {/* Urgent Tasks */}
                {urgentTasks.length > 0 && (
                    <div className="card">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-xs font-semibold text-rose-400 uppercase tracking-wide flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Needs Attention
                            </div>
                            <Link to="/user/my-tasks" className="text-[10px] text-primary hover:text-primary-hover font-medium">View all →</Link>
                        </div>
                        <div className="divide-y divide-slate-700/50">
                            {urgentTasks.map(t => {
                                const daysLeft = getDaysUntilDue(t.dueDate);
                                const overdue = isOverdue(t.dueDate) && t.status !== 'Completed';
                                return (
                                    <Link key={t._id} to={`/user/task/${t._id}`} className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-slate-700/30 transition-colors group">
                                        <div className={`h-2 w-2 rounded-full shrink-0 ${overdue ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-slate-200 group-hover:text-primary truncate transition-colors">{t.title}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getStatusColor(t.status)}`}>{t.status}</span>
                                                <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className={`text-[10px] font-bold ${overdue ? 'text-rose-400' : 'text-amber-400'}`}>
                                                {overdue ? `${Math.abs(daysLeft!)}d overdue` : daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Recent Tasks */}
                    <div className="lg:col-span-2 card">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recent Tasks</div>
                            <Link to="/user/my-tasks" className="text-[10px] text-primary hover:text-primary-hover font-medium">View all →</Link>
                        </div>
                        {dashboardData?.recentTasks?.length === 0 ? (
                            <div className="text-center py-8">
                                <svg className="w-10 h-10 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <div className="text-xs text-slate-500">No tasks yet. Check back later!</div>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-700/50">
                                {dashboardData?.recentTasks?.slice(0, 5).map(task => (
                                    <Link key={task._id} to={`/user/task/${task._id}`} className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-slate-700/30 transition-colors group">
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-slate-200 group-hover:text-primary truncate transition-colors">{task.title}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getStatusColor(task.status)}`}>{task.status}</span>
                                                <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                                                {task.dueDate && (
                                                    <span className={`text-[10px] ${isOverdue(task.dueDate) && task.status !== 'Completed' ? 'text-rose-400' : 'text-slate-500'}`}>
                                                        Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                )}
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

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Quick Actions */}
                        <div className="card">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Quick Actions</div>
                            <div className="space-y-2">
                                <Link to="/user/my-tasks" className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-700 hover:border-primary/40 hover:bg-slate-700/30 transition-all group">
                                    <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-slate-200 group-hover:text-primary transition-colors">View My Tasks</div>
                                        <div className="text-[10px] text-slate-500">See all assigned tasks</div>
                                    </div>
                                </Link>
                                <Link to="/user/my-tasks?status=Pending" className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-700 hover:border-amber-400/40 hover:bg-slate-700/30 transition-all group">
                                    <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-slate-200 group-hover:text-primary transition-colors">Pending Tasks</div>
                                        <div className="text-[10px] text-slate-500">Tasks waiting to start</div>
                                    </div>
                                </Link>
                                <Link to="/user/my-tasks?status=Completed" className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-700 hover:border-emerald-400/40 hover:bg-slate-700/30 transition-all group">
                                    <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-slate-200 group-hover:text-primary transition-colors">Completed</div>
                                        <div className="text-[10px] text-slate-500">Tasks you've finished</div>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        {/* Status Summary */}
                        <div className="card">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Task Status</div>
                            <div className="space-y-2">
                                {[
                                    { label: 'Pending', count: stats.pending, color: 'bg-yellow-500' },
                                    { label: 'In Progress', count: stats.inProgress, color: 'bg-blue-500' },
                                    { label: 'In Review', count: stats.inReview, color: 'bg-purple-500' },
                                    { label: 'Completed', count: stats.completed, color: 'bg-emerald-500' },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${item.color}`} />
                                            <span className="text-xs text-slate-400">{item.label}</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-300 tabular-nums">{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PageShell>
    );
}

export default UserDashboard;
